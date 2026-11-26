-- =============================================================================
-- Incident reports: falls, injuries, medication errors, safeguarding worries.
--
-- A care worker logs an incident for a client they look after (the office can
-- log one too). The office follows it up: open -> investigating -> closed. What
-- was reported is never rewritten; the office adds its own notes alongside.
-- =============================================================================

create sequence public.care_incident_number_seq;

create table public.care_incidents (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique default ('IR-' || lpad(nextval('public.care_incident_number_seq')::text, 6, '0')),
  client_id      uuid not null references public.care_clients (id) on delete restrict,
  reported_by    uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  occurred_at    timestamptz not null,
  place          text check (char_length(place) <= 200),
  kind           text not null check (kind in ('fall', 'injury', 'medication', 'behaviour', 'safeguarding', 'health', 'property', 'near_miss', 'other')),
  severity       text not null check (severity in ('minor', 'moderate', 'serious')),
  what_happened  text not null check (char_length(what_happened) between 10 and 4000),
  action_taken   text not null check (char_length(action_taken) between 2 and 4000),
  people_told    text[] not null default '{}'
                   check (people_told <@ array['family', 'doctor', 'ambulance', 'police', 'manager']::text[]),
  witnesses      text check (char_length(witnesses) <= 500),
  status         text not null default 'open' check (status in ('open', 'investigating', 'closed')),
  office_notes   text check (char_length(office_notes) <= 4000),
  closed_at      timestamptz,
  closed_by      uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint care_incidents_not_future check (occurred_at <= created_at + interval '10 minutes')
);
comment on table public.care_incidents is 'Incidents (falls, injuries, medication errors, safeguarding) and how the office followed them up.';
create index care_incidents_status_idx on public.care_incidents (status, created_at desc);
create index care_incidents_client_idx on public.care_incidents (client_id, occurred_at desc);
create index care_incidents_reporter_idx on public.care_incidents (reported_by, created_at desc);

create trigger care_incidents_set_updated_at
  before update on public.care_incidents
  for each row execute function private.set_updated_at();

-- What was reported stays as reported. Only the status and office notes change,
-- and closing records who closed it and when.
create function private.guard_care_incident()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference <> old.reference or new.client_id <> old.client_id or new.reported_by <> old.reported_by
     or new.occurred_at <> old.occurred_at or new.place is distinct from old.place or new.kind <> old.kind
     or new.severity <> old.severity or new.what_happened <> old.what_happened or new.action_taken <> old.action_taken
     or new.people_told <> old.people_told or new.witnesses is distinct from old.witnesses
     or new.created_at <> old.created_at then
    raise exception 'An incident report cannot be rewritten. Add an office note instead.' using errcode = '42501';
  end if;
  if new.status = 'closed' and old.status <> 'closed' then
    new.closed_at := now();
    new.closed_by := (select auth.uid());
  elsif new.status <> 'closed' then
    new.closed_at := null;
    new.closed_by := null;
  else
    new.closed_at := old.closed_at;
    new.closed_by := old.closed_by;
  end if;
  return new;
end;
$$;
create trigger care_incidents_guard
  before update on public.care_incidents
  for each row execute function private.guard_care_incident();

-- Counts for the dashboard badge and overview.
create function public.care_incident_counts()
returns table (open bigint, serious_open bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) filter (where status <> 'closed'),
         count(*) filter (where status <> 'closed' and severity = 'serious')
  from public.care_incidents;
$$;

-- ---------- Row Level Security ----------
alter table public.care_incidents enable row level security;

create policy "care_incidents: office read" on public.care_incidents
  for select to authenticated using (public.has_permission('care_ops.view'));
create policy "care_incidents: own read" on public.care_incidents
  for select to authenticated using (reported_by = (select auth.uid()));
create policy "care_incidents: report" on public.care_incidents
  for insert to authenticated
  with check (reported_by = (select auth.uid()) and status = 'open' and office_notes is null
              and closed_at is null and closed_by is null
              and (public.is_assigned_to(client_id) or public.has_permission('care_ops.edit')));
create policy "care_incidents: office follow-up" on public.care_incidents
  for update to authenticated
  using (public.has_permission('care_ops.edit'))
  with check (public.has_permission('care_ops.edit'));
-- No delete policy: incident records are kept.

revoke all on public.care_incidents from anon;
grant select, insert, update on public.care_incidents to authenticated;
revoke truncate, references, trigger on public.care_incidents from authenticated;
grant usage on sequence public.care_incident_number_seq to authenticated;
grant all on public.care_incidents to service_role;
grant usage on sequence public.care_incident_number_seq to service_role;
revoke all on function public.care_incident_counts() from public, anon;
grant execute on function public.care_incident_counts() to authenticated;
revoke all on function private.guard_care_incident() from public;

select private.enable_audit('public.care_incidents');
