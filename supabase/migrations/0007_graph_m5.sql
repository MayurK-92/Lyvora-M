-- M5: entities, memory_entities, memory_edges for graph / dedup.
-- Apply in Supabase SQL Editor (or via service DB URL).

create extension if not exists unaccent;

do $$ begin
  create type entity_kind as enum (
    'person','company','product','technology','ingredient','place','book','movie','topic','exercise','other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type edge_kind as enum (
    'similar','about_same','follow_up','contradicts','duplicate','part_of'
  );
exception when duplicate_object then null;
end $$;

create table if not exists entities (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kind          entity_kind not null,
  name          text not null,
  norm_name     text not null,
  aliases       text[] not null default '{}',
  embedding     vector(1536),
  mention_count int not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id, kind, norm_name)
);

create index if not exists entities_user_idx on entities (user_id);
create index if not exists entities_trgm_idx on entities using gin (norm_name gin_trgm_ops);
create index if not exists entities_embedding_idx
  on entities using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create table if not exists memory_entities (
  memory_id  uuid not null references memories(id) on delete cascade,
  entity_id  uuid not null references entities(id) on delete cascade,
  role       text,
  salience   real not null default 0.5,
  primary key (memory_id, entity_id)
);

create index if not exists memory_entities_entity_idx on memory_entities (entity_id);

create table if not exists memory_edges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  src_id     uuid not null references memories(id) on delete cascade,
  dst_id     uuid not null references memories(id) on delete cascade,
  kind       edge_kind not null,
  score      real not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique (src_id, dst_id, kind),
  check (src_id <> dst_id)
);

create index if not exists memory_edges_user_idx on memory_edges (user_id);
create index if not exists memory_edges_src_idx on memory_edges (src_id);
create index if not exists memory_edges_dst_idx on memory_edges (dst_id);

alter table entities enable row level security;
alter table memory_entities enable row level security;
alter table memory_edges enable row level security;

drop policy if exists entities_select on entities;
drop policy if exists entities_insert on entities;
drop policy if exists entities_update on entities;
drop policy if exists entities_delete on entities;
drop policy if exists memory_entities_select on memory_entities;
drop policy if exists memory_entities_insert on memory_entities;
drop policy if exists memory_entities_update on memory_entities;
drop policy if exists memory_entities_delete on memory_entities;
drop policy if exists memory_edges_select on memory_edges;
drop policy if exists memory_edges_insert on memory_edges;
drop policy if exists memory_edges_update on memory_edges;
drop policy if exists memory_edges_delete on memory_edges;

create policy entities_select on entities
  for select using (auth.uid() = user_id);
create policy entities_insert on entities
  for insert with check (auth.uid() = user_id);
create policy entities_update on entities
  for update using (auth.uid() = user_id);
create policy entities_delete on entities
  for delete using (auth.uid() = user_id);

create policy memory_entities_select on memory_entities
  for select using (
    exists (
      select 1 from memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );
create policy memory_entities_insert on memory_entities
  for insert with check (
    exists (
      select 1 from memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );
create policy memory_entities_update on memory_entities
  for update using (
    exists (
      select 1 from memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );
create policy memory_entities_delete on memory_entities
  for delete using (
    exists (
      select 1 from memories m
      where m.id = memory_id and m.user_id = auth.uid()
    )
  );

create policy memory_edges_select on memory_edges
  for select using (auth.uid() = user_id);
create policy memory_edges_insert on memory_edges
  for insert with check (auth.uid() = user_id);
create policy memory_edges_update on memory_edges
  for update using (auth.uid() = user_id);
create policy memory_edges_delete on memory_edges
  for delete using (auth.uid() = user_id);
