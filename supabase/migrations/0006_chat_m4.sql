-- M4: chat threads + messages for grounded RAG.
-- Apply in Supabase SQL Editor (or via service DB URL).

create table if not exists chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references chat_threads(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant', 'system')),
  content    jsonb not null,
  citations  uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_user_created_idx
  on chat_threads (user_id, created_at desc);
create index if not exists chat_messages_thread_created_idx
  on chat_messages (thread_id, created_at);
create index if not exists chat_messages_user_created_idx
  on chat_messages (user_id, created_at desc);

alter table chat_threads enable row level security;
alter table chat_messages enable row level security;

drop policy if exists chat_threads_select on chat_threads;
drop policy if exists chat_threads_insert on chat_threads;
drop policy if exists chat_threads_update on chat_threads;
drop policy if exists chat_threads_delete on chat_threads;
drop policy if exists chat_messages_select on chat_messages;
drop policy if exists chat_messages_insert on chat_messages;
drop policy if exists chat_messages_update on chat_messages;
drop policy if exists chat_messages_delete on chat_messages;

create policy chat_threads_select on chat_threads
  for select using (auth.uid() = user_id);
create policy chat_threads_insert on chat_threads
  for insert with check (auth.uid() = user_id);
create policy chat_threads_update on chat_threads
  for update using (auth.uid() = user_id);
create policy chat_threads_delete on chat_threads
  for delete using (auth.uid() = user_id);

create policy chat_messages_select on chat_messages
  for select using (auth.uid() = user_id);
create policy chat_messages_insert on chat_messages
  for insert with check (auth.uid() = user_id);
create policy chat_messages_update on chat_messages
  for update using (auth.uid() = user_id);
create policy chat_messages_delete on chat_messages
  for delete using (auth.uid() = user_id);
