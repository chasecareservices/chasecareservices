-- =============================================================================
-- Visit locations: confirm care workers were with their client.
--
-- When a care worker writes a report, their phone's location is recorded once
-- (with their permission). The office sees it on a map, and how far it was from
-- the client's home. If location is blocked or unavailable the worker can still
-- send the report, and the office sees why there is no location.
-- Locations are evidence, so a care worker cannot change them after sending.
-- =============================================================================

alter table public.care_reports
  add column location_status text not null default 'not_recorded'
    check (location_status in ('captured', 'denied', 'unavailable', 'not_supported', 'not_recorded')),
  add column location_lat double precision check (location_lat between -90 and 90),
  add column location_lng double precision check (location_lng between -180 and 180),
  add column location_accuracy_m real check (location_accuracy_m >= 0 and location_accuracy_m <= 100000),
  add column location_captured_at timestamptz,
  add constraint care_reports_location_complete check (
    (location_status = 'captured') = (location_lat is not null and location_lng is not null and location_captured_at is not null)
  ),
  add constraint care_reports_location_time check (
    location_captured_at is null or location_captured_at <= submitted_at + interval '5 minutes'
  );
comment on column public.care_reports.location_status is 'captured = the phone''s location was recorded; denied = the worker blocked location; unavailable / not_supported = the phone could not provide one; not_recorded = reports sent before locations existed.';

alter table public.care_clients
  add column home_lat double precision check (home_lat between -90 and 90),
  add column home_lng double precision check (home_lng between -180 and 180),
  add constraint care_clients_home_complete check ((home_lat is null) = (home_lng is null));
comment on column public.care_clients.home_lat is 'Where care is given, to compare with the location on visit reports.';

-- Extend the report guard: care workers cannot change the location after sending.
create or replace function private.guard_care_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference <> old.reference or new.worker_id <> old.worker_id or new.submitted_at <> old.submitted_at then
    raise exception 'The reference, author and submission time of a report cannot change' using errcode = '42501';
  end if;
  if new.location_status is distinct from old.location_status
     or new.location_lat is distinct from old.location_lat
     or new.location_lng is distinct from old.location_lng
     or new.location_accuracy_m is distinct from old.location_accuracy_m
     or new.location_captured_at is distinct from old.location_captured_at then
    raise exception 'The location recorded with a report cannot be changed' using errcode = '42501';
  end if;
  if public.has_permission('care_ops.edit') then
    if new.status = 'reviewed' and old.status = 'submitted' then
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    end if;
    return new;
  end if;
  -- A worker editing their own report:
  if old.status <> 'submitted' then
    raise exception 'This report has already been read by the office. Please contact the office to change it.' using errcode = '42501';
  end if;
  if new.client_id <> old.client_id
     or new.status <> old.status
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.office_note is distinct from old.office_note then
    raise exception 'Only the office can change those details' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Note: care workers can read their assigned clients' rows, including the home location.
-- That is intended: they visit those homes. They cannot change clients.
