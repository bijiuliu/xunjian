alter table public.user_preferences
  add column if not exists sessions_revoked_at timestamptz,
  add column if not exists sessions_revoked_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_preferences'
  ) then
    alter publication supabase_realtime add table public.user_preferences;
  end if;
end
$$;
