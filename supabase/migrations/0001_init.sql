-- M0: profiles table (system_design.md §5.2) + RLS (§5.4) + auto-provisioning on signup.

create extension if not exists pgcrypto;

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  timezone      text not null default 'UTC',
  interests     jsonb not null default '{}'::jsonb,   -- learned topic weights (PRD §22)
  created_at    timestamptz not null default now()
);

alter table profiles enable row level security;

create policy profiles_select on profiles for select using (auth.uid() = id);
create policy profiles_insert on profiles for insert with check (auth.uid() = id);
create policy profiles_update on profiles for update using (auth.uid() = id);

-- Every signup must produce a profile row with no app-layer race (system_design.md §3 "profiles" note).
-- security definer is required because this trigger runs as the invoking role (a new auth user has no
-- privileges yet); search_path is pinned to prevent search-path hijacking in a security-definer function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
