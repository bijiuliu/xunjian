create extension if not exists pgcrypto;

create table if not exists public.inspection_records (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  inspection_date text not null,
  inspection_time text not null,
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  constraint inspection_records_values_object
    check (jsonb_typeof(values) = 'object')
);

create index if not exists inspection_records_user_id_idx
  on public.inspection_records (user_id);
create index if not exists inspection_records_user_active_idx
  on public.inspection_records (user_id, deleted_at);

create table if not exists public.inspection_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  belt_tab text not null default 'SZ101',
  updated_at timestamptz not null default now(),
  constraint inspection_drafts_values_object
    check (jsonb_typeof(values) = 'object'),
  constraint inspection_drafts_belt_tab
    check (belt_tab in ('SZ101', 'SZ201', 'SZ201-N'))
);

alter table public.inspection_records enable row level security;
alter table public.inspection_drafts enable row level security;

revoke all on public.inspection_records from anon;
revoke all on public.inspection_drafts from anon;
grant select, insert, update, delete on public.inspection_records to authenticated;
grant select, insert, update, delete on public.inspection_drafts to authenticated;

drop policy if exists "Users can read their inspection records"
  on public.inspection_records;
create policy "Users can read their inspection records"
  on public.inspection_records for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their inspection records"
  on public.inspection_records;
create policy "Users can create their inspection records"
  on public.inspection_records for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their inspection records"
  on public.inspection_records;
create policy "Users can update their inspection records"
  on public.inspection_records for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their inspection records"
  on public.inspection_records;
create policy "Users can delete their inspection records"
  on public.inspection_records for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their inspection draft"
  on public.inspection_drafts;
create policy "Users can read their inspection draft"
  on public.inspection_drafts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their inspection draft"
  on public.inspection_drafts;
create policy "Users can create their inspection draft"
  on public.inspection_drafts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their inspection draft"
  on public.inspection_drafts;
create policy "Users can update their inspection draft"
  on public.inspection_drafts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their inspection draft"
  on public.inspection_drafts;
create policy "Users can delete their inspection draft"
  on public.inspection_drafts for delete
  to authenticated
  using ((select auth.uid()) = user_id);
