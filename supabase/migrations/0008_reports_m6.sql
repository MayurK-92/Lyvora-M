-- M6: memory_events + weekly_reports for personalization and digests.
-- Apply in Supabase SQL Editor (or via service DB URL).

create table if not exists memory_events (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  memory_id  uuid not null references memories(id) on delete cascade,
  kind       text not null check (kind in ('view', 'open_source', 'search_hit', 'chat_cite')),
  created_at timestamptz not null default now()
);

create index if not exists memory_events_user_time_idx
  on memory_events (user_id, created_at desc);
create index if not exists memory_events_memory_idx
  on memory_events (memory_id);

create table if not exists weekly_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  week_start  date not null,
  payload     jsonb not null,
  narrative   text,
  created_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_reports_user_week_idx
  on weekly_reports (user_id, week_start desc);

alter table memory_events enable row level security;
alter table weekly_reports enable row level security;

drop policy if exists memory_events_select on memory_events;
drop policy if exists memory_events_insert on memory_events;
drop policy if exists memory_events_delete on memory_events;
drop policy if exists weekly_reports_select on weekly_reports;
drop policy if exists weekly_reports_insert on weekly_reports;
drop policy if exists weekly_reports_update on weekly_reports;
drop policy if exists weekly_reports_delete on weekly_reports;

create policy memory_events_select on memory_events
  for select using (auth.uid() = user_id);
create policy memory_events_insert on memory_events
  for insert with check (auth.uid() = user_id);
create policy memory_events_delete on memory_events
  for delete using (auth.uid() = user_id);

create policy weekly_reports_select on weekly_reports
  for select using (auth.uid() = user_id);
create policy weekly_reports_insert on weekly_reports
  for insert with check (auth.uid() = user_id);
create policy weekly_reports_update on weekly_reports
  for update using (auth.uid() = user_id);
create policy weekly_reports_delete on weekly_reports
  for delete using (auth.uid() = user_id);
