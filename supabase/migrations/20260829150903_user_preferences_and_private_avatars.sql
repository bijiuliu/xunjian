create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  navigation_order text[] not null default array['slag8', 'belt', 'slag9', 'history']::text[],
  avatar_path text,
  updated_at timestamptz not null default now(),
  constraint user_preferences_navigation_order
    check (
      cardinality(navigation_order) = 4
      and navigation_order <@ array['slag8', 'belt', 'slag9', 'history']::text[]
      and array['slag8', 'belt', 'slag9', 'history']::text[] <@ navigation_order
    ),
  constraint user_preferences_avatar_path
    check (avatar_path is null or avatar_path like user_id::text || '/%')
);

alter table public.user_preferences enable row level security;

revoke all on public.user_preferences from anon;
revoke all on public.user_preferences from authenticated;
grant select, insert, update on public.user_preferences to authenticated;

drop policy if exists "Users can read their preferences"
  on public.user_preferences;
create policy "Users can read their preferences"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their preferences"
  on public.user_preferences;
create policy "Users can create their preferences"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their preferences"
  on public.user_preferences;
create policy "Users can update their preferences"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own avatar"
  on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can read their own avatar"
  on storage.objects;
create policy "Users can read their own avatar"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own avatar"
  on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
