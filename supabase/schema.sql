-- Run ONLY in the new owner's Supabase SQL Editor. No real credentials here.
create table if not exists public.duo_state (
 id int primary key check (id=1),
 revision bigint not null default 0,
 data jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.duo_users (
 username text primary key check (username in ('one','two')),
 password_hash text,
 session_version int not null default 1
);
create table if not exists public.duo_history (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 revision bigint not null unique,
 description text not null
);
create table if not exists public.duo_login_attempts (
 id bigint generated always as identity primary key,
 username text not null,
 created_at timestamptz not null default now()
);
create index if not exists duo_login_attempts_recent_idx on public.duo_login_attempts(username,created_at desc);
create index if not exists duo_history_recent_idx on public.duo_history(created_at desc);
insert into public.duo_state(id,revision,data) values
 (1,0,'{"version":1,"people":["Участник 1","Участник 2"],"tasks":{"one":[],"two":[]},"events":[]}'::jsonb)
on conflict(id) do nothing;
insert into public.duo_users(username) values ('one'),('two') on conflict(username) do nothing;
alter table public.duo_state enable row level security;
alter table public.duo_users enable row level security;
alter table public.duo_history enable row level security;
alter table public.duo_login_attempts enable row level security;
revoke all on public.duo_state,public.duo_users,public.duo_history,public.duo_login_attempts from public,anon,authenticated;
revoke all on sequence public.duo_history_id_seq,public.duo_login_attempts_id_seq from public,anon,authenticated;
grant select,insert,update,delete on public.duo_state,public.duo_users,public.duo_history,public.duo_login_attempts to service_role;
grant usage,select on sequence public.duo_history_id_seq,public.duo_login_attempts_id_seq to service_role;
-- No anon/authenticated RLS policies: only the Edge Function with a backend secret may access these tables.
