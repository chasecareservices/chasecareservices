-- =============================================================================
-- Shift schedule: planned visits, and which ones happened.
--
-- The office (care_ops.edit) books visits. Care workers see their own. A visit
-- is "done" when the worker sends a report for it (linked by shift_id, or a
-- report for the same client, worker and day), and "missed" when no report has
-- arrived 2 hours after it should have finished. Ghana is on UTC all year.
-- =============================================================================

create table public.care_shifts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.care_clients (id) on delete cascade,
  worker_id   uuid not null references public.profiles (id) on delete restrict,
  shift_date  date not null,
  start_time  time not null,
  end_time    time not null,
  notes       text check (char_length(notes) <= 500),
  status      text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  constraint care_shifts_times check (end_time > start_time)
);
comment on table public.care_shifts is 'A planned visit: which care worker visits which client, when.';
create index care_shifts_worker_idx on public.care_shifts (worker_id, shift_date);
create index care_shifts_date_idx on public.care_shifts (shift_date);

create trigger care_shifts_set_updated_at
  before update on public.care_shifts
  for each row execute function private.set_updated_at();

-- A report can say which booked visit it is for.
alter table public.care_reports add column shift_id uuid references public.care_shifts (id) on delete set null;
create index care_reports_shift_idx on public.care_reports (shift_id);

-- A report may only point at the worker's own visit to that same client.
create function private.check_report_shift()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.shift_id is not null and not exists (
    select 1 from public.care_shifts s
    where s.id = new.shift_id and s.worker_id = new.worker_id and s.client_id = new.client_id
  ) then
    raise exception 'That visit is not yours, or is for a different client' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger care_reports_check_shift
  before insert or update of shift_id, client_id on public.care_reports
  for each row execute function private.check_report_shift();

-- Each visit with its report (if any) and where it stands.
create view public.care_shift_status
with (security_invoker = true)
as
select
  s.*,
  r.id as report_id,
  r.reference as report_reference,
  case
    when s.status = 'cancelled' then 'cancelled'
    when r.id is not null then 'done'
    when (s.shift_date + s.end_time) + interval '2 hours' < now() then 'missed'
    when (s.shift_date + s.start_time) <= now() then 'in_progress'
    else 'upcoming'
  end as visit_status
from public.care_shifts s
left join lateral (
  select cr.id, cr.reference
  from public.care_reports cr
  where cr.shift_id = s.id
     or (cr.shift_id is null and cr.worker_id = s.worker_id and cr.client_id = s.client_id and cr.visit_date = s.shift_date)
  order by (cr.shift_id = s.id) desc nulls last, cr.submitted_at
  limit 1
) r on true;
comment on view public.care_shift_status is 'Visits with their report and status (upcoming, in_progress, done, missed, cancelled). Uses the reader''s own access rules.';

-- Missed visits in the last 7 days, for the dashboard badge.
create function public.missed_visit_count()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) from public.care_shift_status
  where visit_status = 'missed' and shift_date >= current_date - 7;
$$;

-- ---------- Row Level Security ----------
alter table public.care_shifts enable row level security;

create policy "care_shifts: office read" on public.care_shifts
  for select to authenticated using (public.has_permission('care_ops.view') or public.has_permission('clients.view'));
create policy "care_shifts: own read" on public.care_shifts
  for select to authenticated using (worker_id = (select auth.uid()) and public.is_care_worker());
create policy "care_shifts: office write" on public.care_shifts
  for all to authenticated
  using (public.has_permission('care_ops.edit'))
  with check (public.has_permission('care_ops.edit'));

revoke all on public.care_shifts, public.care_shift_status from anon;
revoke all on public.care_shift_status from authenticated; -- a read-only view: no write or TRUNCATE rights
grant select, insert, update, delete on public.care_shifts to authenticated;
grant select on public.care_shift_status to authenticated;
revoke truncate, references, trigger on public.care_shifts from authenticated;
grant all on public.care_shifts to service_role;
grant select on public.care_shift_status to service_role;
revoke all on function public.missed_visit_count() from public, anon;
grant execute on function public.missed_visit_count() to authenticated;
revoke all on function private.check_report_shift() from public;

select private.enable_audit('public.care_shifts');
