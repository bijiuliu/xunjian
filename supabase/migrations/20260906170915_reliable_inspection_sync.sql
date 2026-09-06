create or replace function public.replace_inspection_records(
  p_user_id uuid,
  p_records jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_at timestamptz := clock_timestamp();
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise insufficient_privilege using message = 'Cannot replace another user''s inspection records';
  end if;

  if jsonb_typeof(p_records) is distinct from 'array' then
    raise check_violation using message = 'Inspection records must be a JSON array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_records) as item
    where jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or jsonb_typeof(item->'inspection_date') is distinct from 'string'
      or jsonb_typeof(item->'inspection_time') is distinct from 'string'
      or jsonb_typeof(item->'values') is distinct from 'object'
      or (
        item ? 'recorded_at'
        and item->'recorded_at' <> 'null'::jsonb
        and jsonb_typeof(item->'recorded_at') is distinct from 'string'
      )
  ) then
    raise check_violation using message = 'Inspection replacement contains an invalid record';
  end if;

  if exists (
    select item->>'id'
    from jsonb_array_elements(p_records) as item
    group by item->>'id'
    having count(*) > 1
  ) then
    raise unique_violation using message = 'Inspection replacement contains duplicate record ids';
  end if;

  insert into public.inspection_records (
    id,
    user_id,
    inspection_date,
    inspection_time,
    recorded_at,
    values,
    updated_at,
    deleted_at
  )
  select
    item->>'id',
    p_user_id,
    item->>'inspection_date',
    item->>'inspection_time',
    nullif(item->>'recorded_at', '')::timestamptz,
    item->'values',
    changed_at,
    null
  from jsonb_array_elements(p_records) as item
  on conflict (user_id, id) do update
  set
    inspection_date = excluded.inspection_date,
    inspection_time = excluded.inspection_time,
    recorded_at = excluded.recorded_at,
    values = excluded.values,
    updated_at = excluded.updated_at,
    deleted_at = null;

  update public.inspection_records as existing
  set deleted_at = changed_at, updated_at = changed_at
  where existing.user_id = p_user_id
    and existing.deleted_at is null
    and not exists (
      select 1
      from jsonb_array_elements(p_records) as item
      where item->>'id' = existing.id
    );
end;
$$;

revoke all on function public.replace_inspection_records(uuid, jsonb)
from public, anon;

grant execute on function public.replace_inspection_records(uuid, jsonb)
to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inspection_records'
  ) then
    alter publication supabase_realtime add table public.inspection_records;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inspection_drafts'
  ) then
    alter publication supabase_realtime add table public.inspection_drafts;
  end if;
end
$$;
