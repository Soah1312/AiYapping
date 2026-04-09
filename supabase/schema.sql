create extension if not exists "pgcrypto";

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  share_id text unique not null,
  session_id text not null,
  topic text not null,
  mode text not null check (mode in ('debate', 'chat')),
  models jsonb not null,
  transcript jsonb not null,
  turn_count int not null,
  verdict jsonb,
  created_at timestamptz default now()
);

create table if not exists public.free_usage (
  session_id text primary key,
  turns_used int default 0,
  date date default current_date,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.free_usage enable row level security;

drop policy if exists "Allow session scoped conversation reads" on public.conversations;
drop policy if exists "Allow session scoped conversation inserts" on public.conversations;
drop policy if exists "Allow service role updates conversations" on public.conversations;
drop policy if exists "Public read by share id" on public.conversations;
drop policy if exists "Allow session scoped usage reads" on public.free_usage;
drop policy if exists "Allow session scoped usage upserts" on public.free_usage;

create policy "Allow session scoped conversation reads"
on public.conversations
for select
using (
  session_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'session_id')
);

create policy "Allow session scoped conversation inserts"
on public.conversations
for insert
with check (
  session_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'session_id')
);

create policy "Allow service role updates conversations"
on public.conversations
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Public read by share id"
on public.conversations
for select
using (share_id is not null);

create policy "Allow session scoped usage reads"
on public.free_usage
for select
using (
  session_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'session_id')
);

create policy "Allow session scoped usage upserts"
on public.free_usage
for all
using (
  session_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'session_id')
)
with check (
  session_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'session_id')
);

create index if not exists idx_conversations_share_id on public.conversations (share_id);
create index if not exists idx_conversations_session_id on public.conversations (session_id);
