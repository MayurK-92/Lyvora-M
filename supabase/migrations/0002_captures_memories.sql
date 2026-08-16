-- M1: captures + memories (system_design.md §5.2). Embeddings column present but unused until M3.
-- HNSW index deferred to M3.

create extension if not exists vector;
create extension if not exists pg_trgm;

create type capture_kind as enum ('url', 'text', 'pdf', 'image');
create type capture_status as enum (
  'queued', 'fetching', 'extracting', 'enriching', 'embedding', 'done', 'failed', 'duplicate'
);

create type source_type as enum (
  'web', 'text', 'pdf', 'image',
  'youtube', 'instagram', 'reddit', 'x', 'linkedin', 'github', 'amazon', 'medium', 'notion', 'gmail'
);

create type content_type as enum (
  'article', 'video', 'product', 'recipe', 'workout', 'place', 'repository',
  'paper', 'thread', 'note', 'document', 'image', 'course', 'tool', 'other'
);

create table captures (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  kind            capture_kind not null,
  raw_input       text,
  upload_path     text,
  user_note       text,
  client          text,
  idempotency_key text,
  status          capture_status not null default 'queued',
  attempts        int not null default 0,
  last_error      text,
  memory_id       uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index captures_idem_uk
  on captures (user_id, idempotency_key) where idempotency_key is not null;
create index captures_user_status_idx on captures (user_id, status, created_at desc);

create table memories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  capture_id      uuid references captures(id) on delete set null,

  source_type     source_type not null,
  source_url      text,
  canonical_url   text,
  url_hash        text,
  site_name       text,
  author          text,
  published_at    timestamptz,

  content_type    content_type not null default 'other',
  title           text not null,
  tldr            text,
  summary         text,
  category        text not null default 'Uncategorized',
  tags            text[] not null default '{}',
  language        text default 'en',
  key_points      text[] not null default '{}',

  structured      jsonb not null default '{}'::jsonb,

  hero_image_url  text,
  storage_path    text,
  raw_text        text,

  embedding       vector(1536),
  embedding_model text,
  fts             tsvector generated always as (
                    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(tldr, '')), 'B') ||
                    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
                    setweight(to_tsvector('english', array_to_string(tags, ' ')), 'C') ||
                    setweight(to_tsvector('english', coalesce(raw_text, '')), 'D')
                  ) stored,

  ai_meta         jsonb not null default '{}'::jsonb,
  status          capture_status not null default 'queued',
  duplicate_of    uuid references memories(id) on delete set null,
  is_archived     boolean not null default false,
  is_pinned       boolean not null default false,
  view_count      int not null default 0,
  last_viewed_at  timestamptz,
  saved_at        timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table captures
  add constraint captures_memory_fk
  foreign key (memory_id) references memories(id) on delete set null;

create index memories_user_saved_idx on memories (user_id, saved_at desc) where not is_archived;
create index memories_user_cat_idx on memories (user_id, category);
create index memories_tags_idx on memories using gin (tags);
create index memories_fts_idx on memories using gin (fts);
create index memories_structured_idx on memories using gin (structured jsonb_path_ops);
create unique index memories_user_url_uk on memories (user_id, url_hash) where url_hash is not null;

alter table captures enable row level security;
alter table memories enable row level security;

create policy captures_select on captures for select using (auth.uid() = user_id);
create policy captures_insert on captures for insert with check (auth.uid() = user_id);
create policy captures_update on captures for update using (auth.uid() = user_id);
create policy captures_delete on captures for delete using (auth.uid() = user_id);

create policy memories_select on memories for select using (auth.uid() = user_id);
create policy memories_insert on memories for insert with check (auth.uid() = user_id);
create policy memories_update on memories for update using (auth.uid() = user_id);
create policy memories_delete on memories for delete using (auth.uid() = user_id);

-- Realtime for optimistic capture cards (system_design.md §12).
alter publication supabase_realtime add table captures;
alter publication supabase_realtime add table memories;
