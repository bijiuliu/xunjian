alter table public.inspection_records
  add column if not exists recorded_at timestamptz;

create or replace function public.upsert_inspection_draft_if_newer(
  p_user_id uuid,
  p_values jsonb,
  p_belt_tab text,
  p_updated_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed boolean;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise insufficient_privilege using message = 'Cannot update another user''s inspection draft';
  end if;

  if jsonb_typeof(p_values) is distinct from 'object' then
    raise check_violation using message = 'Inspection draft values must be a JSON object';
  end if;

  if p_belt_tab not in ('SZ101', 'SZ201', 'SZ201-N') then
    raise check_violation using message = 'Invalid inspection draft belt tab';
  end if;

  insert into public.inspection_drafts (
    user_id,
    values,
    belt_tab,
    updated_at
  )
  values (
    p_user_id,
    p_values,
    p_belt_tab,
    p_updated_at
  )
  on conflict (user_id) do update
  set
    values = excluded.values,
    belt_tab = excluded.belt_tab,
    updated_at = excluded.updated_at
  where public.inspection_drafts.updated_at <= excluded.updated_at;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.upsert_inspection_draft_if_newer(
  uuid,
  jsonb,
  text,
  timestamptz
) from public, anon;

grant execute on function public.upsert_inspection_draft_if_newer(
  uuid,
  jsonb,
  text,
  timestamptz
) to authenticated;
