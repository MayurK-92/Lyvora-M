-- M3: memory_chunks, HNSW indexes, hybrid search_memories() RPC.
-- Apply in Supabase SQL Editor (or via service DB URL).

create table if not exists memory_chunks (
  id          uuid primary key default gen_random_uuid(),
  memory_id   uuid not null references memories(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  ordinal     int not null,
  heading     text,
  content     text not null,
  token_count int,
  embedding   vector(1536),
  fts         tsvector generated always as (
                to_tsvector('english', coalesce(content, ''))
              ) stored,
  unique (memory_id, ordinal)
);

create index if not exists chunks_user_idx on memory_chunks (user_id);
create index if not exists chunks_memory_idx on memory_chunks (memory_id);
create index if not exists chunks_fts_idx on memory_chunks using gin (fts);
create index if not exists chunks_embedding_idx
  on memory_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists memories_embedding_idx
  on memories using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table memory_chunks enable row level security;

drop policy if exists memory_chunks_select on memory_chunks;
drop policy if exists memory_chunks_insert on memory_chunks;
drop policy if exists memory_chunks_update on memory_chunks;
drop policy if exists memory_chunks_delete on memory_chunks;

create policy memory_chunks_select on memory_chunks
  for select using (auth.uid() = user_id);
create policy memory_chunks_insert on memory_chunks
  for insert with check (auth.uid() = user_id);
create policy memory_chunks_update on memory_chunks
  for update using (auth.uid() = user_id);
create policy memory_chunks_delete on memory_chunks
  for delete using (auth.uid() = user_id);

create or replace function search_memories(
  p_user_id         uuid,
  p_query_text      text,
  p_query_embedding vector(1536),
  p_categories      text[] default null,
  p_tags            text[] default null,
  p_content_types   content_type[] default null,
  p_from            timestamptz default null,
  p_to              timestamptz default null,
  p_limit           int default 20,
  p_fts_weight      float default 1.0,
  p_vec_weight      float default 1.4,
  p_rrf_k           int default 60
)
returns table (id uuid, score float, fts_rank int, vec_rank int)
language plpgsql
stable
as $$
begin
  perform set_config('hnsw.ef_search', '64', true);

  return query
  with base as (
    select m.id, m.fts, m.embedding, m.saved_at, m.view_count
    from memories m
    where m.user_id = p_user_id
      and not m.is_archived
      and m.duplicate_of is null
      and (p_categories is null or m.category = any(p_categories))
      and (p_tags is null or m.tags && p_tags)
      and (p_content_types is null or m.content_type = any(p_content_types))
      and (p_from is null or m.saved_at >= p_from)
      and (p_to is null or m.saved_at <= p_to)
  ),
  full_text as (
    select b.id,
           row_number() over (
             order by ts_rank_cd(b.fts, websearch_to_tsquery('english', p_query_text)) desc
           ) as rank_ix
    from base b
    where p_query_text is not null
      and length(trim(p_query_text)) > 0
      and b.fts @@ websearch_to_tsquery('english', p_query_text)
    limit greatest(p_limit * 4, 20)
  ),
  semantic as (
    select b.id,
           row_number() over (order by b.embedding <=> p_query_embedding) as rank_ix
    from base b
    where b.embedding is not null
      and p_query_embedding is not null
    order by b.embedding <=> p_query_embedding
    limit greatest(p_limit * 4, 20)
  )
  select
    b.id,
    (
      coalesce(p_fts_weight / (p_rrf_k + f.rank_ix), 0.0)
      + coalesce(p_vec_weight / (p_rrf_k + s.rank_ix), 0.0)
    )
      * (1 + 0.05 * ln(1 + b.view_count))
      * (1 + 0.10 * exp(-extract(epoch from (now() - b.saved_at)) / 2592000.0))
      as score,
    f.rank_ix::int as fts_rank,
    s.rank_ix::int as vec_rank
  from base b
  left join full_text f on f.id = b.id
  left join semantic s on s.id = b.id
  where f.id is not null or s.id is not null
  order by score desc
  limit p_limit;
end;
$$;

grant execute on function search_memories(
  uuid, text, vector, text[], text[], content_type[], timestamptz, timestamptz, int, float, float, int
) to authenticated, service_role;
