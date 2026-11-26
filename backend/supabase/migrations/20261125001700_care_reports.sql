-- =============================================================================
-- Care visit reports.
--
-- Care workers (role "worker") write a report after each visit to a client they
-- are assigned to. The office (care_ops.*) reads them, marks them as read and can
-- leave a note back. Clients and assignments are managed with clients.*.
--
-- These are care records: nobody can delete a report, and every change is audited.
-- Ghana is on UTC all year, so current_date is the local date.
-- =============================================================================

-- ---------- Types ----------
create type public.care_mood as enum ('great', 'good', 'okay', 'low', 'distressed');
create type public.care_concern as enum ('none', 'monitor', 'urgent');
create type public.care_report_status as enum ('submitted', 'reviewed');

-- ---------- Clients receiving care ----------
create table public.care_clients (
  id                       uuid primary key default gen_random_uuid(),
  full_name                text not null check (char_length(full_name) between 2 and 120),
  preferred_name           text check (char_length(preferred_name) <= 60),
  area                     text check (char_length(area) <= 120),
  care_summary             text check (char_length(care_summary) <= 2000),
  emergency_contact_name   text check (char_length(emergency_contact_name) <= 120),
  emergency_contact_phone  text check (char_length(emergency_contact_phone) <= 40),
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  updated_by               uuid references auth.users (id) on delete set null
);
comment on table public.care_clients is 'People Chase Care supports. Visible to office staff (clients.view) and to the care workers assigned to them.';

create trigger care_clients_set_updated_at
  before update on public.care_clients
  for each row execute function private.set_updated_at();

-- ---------- Which worker cares for which client ----------
create table public.care_assignments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.care_clients (id) on delete cascade,
  worker_id   uuid not null references public.profiles (id) on delete cascade,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (client_id, worker_id)
);
create index care_assignments_worker_idx on public.care_assignments (worker_id) where is_active;

-- ---------- Visit reports ----------
create sequence public.care_report_number_seq;

create table public.care_reports (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique default ('CR-' || lpad(nextval('public.care_report_number_seq')::text, 6, '0')),
  client_id       uuid not null references public.care_clients (id) on delete restrict,
  worker_id       uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  visit_date      date not null default current_date,
  start_time      time,
  end_time        time,
  mood            public.care_mood not null,
  activities      text[] not null default '{}' check (cardinality(activities) <= 20),
  meals           text check (meals in ('ate_well', 'ate_some', 'ate_little', 'refused', 'not_applicable')),
  medication      text check (medication in ('as_prescribed', 'partly', 'refused', 'missed', 'not_due', 'not_applicable')),
  summary         text not null check (char_length(btrim(summary)) between 10 and 4000),
  concern_level   public.care_concern not null default 'none',
  concerns        text check (char_length(concerns) <= 4000),
  status          public.care_report_status not null default 'submitted',
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  reviewed_by     uuid references auth.users (id) on delete set null,
  reviewed_at     timestamptz,
  office_note     text check (char_length(office_note) <= 2000),
  constraint care_reports_times check (start_time is null or end_time is null or end_time > start_time),
  constraint care_reports_visit_not_future check (visit_date <= current_date + 1),
  constraint care_reports_concern_explained check (concern_level = 'none' or char_length(btrim(coalesce(concerns, ''))) >= 5)
);
comment on table public.care_reports is 'A care worker''s report of one visit. Cannot be deleted; workers may correct their own until the office marks it read.';
create index care_reports_inbox_idx on public.care_reports (status, concern_level, submitted_at desc);
create index care_reports_client_idx on public.care_reports (client_id, visit_date desc);
create index care_reports_worker_idx on public.care_reports (worker_id, submitted_at desc);

create trigger care_reports_set_updated_at
  before update on public.care_reports
  for each row execute function private.set_updated_at();

-- ---------- Helpers ----------
create function public.is_care_worker()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_has_role('worker');
$$;
comment on function public.is_care_worker() is 'True when the signed-in, active user has the Worker role (care worker portal).';

create function public.is_assigned_to(client uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_care_worker() and exists (
    select 1 from public.care_assignments a
    where a.client_id = client and a.worker_id = (select auth.uid()) and a.is_active
  );
$$;

-- Workers may correct what they wrote, but never the office's fields, the client,
-- the author or the reference. Only the office (care_ops.edit) marks a report read.
create function private.guard_care_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reference <> old.reference or new.worker_id <> old.worker_id or new.submitted_at <> old.submitted_at then
    raise exception 'The reference, author and submission time of a report cannot change' using errcode = '42501';
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

create trigger care_reports_guard
  before update on public.care_reports
  for each row execute function private.guard_care_report();

-- Counts for the dashboard badge and overview.
create function public.care_report_counts()
returns table (to_read bigint, urgent bigint, monitor bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where status = 'submitted'),
    count(*) filter (where status = 'submitted' and concern_level = 'urgent'),
    count(*) filter (where status = 'submitted' and concern_level = 'monitor')
  from public.care_reports;
$$;

-- ---------- Row Level Security ----------
alter table public.care_clients enable row level security;
alter table public.care_assignments enable row level security;
alter table public.care_reports enable row level security;

create policy "care_clients: office read" on public.care_clients
  for select to authenticated using (public.has_permission('clients.view') or public.has_permission('care_ops.view'));
create policy "care_clients: assigned worker read" on public.care_clients
  for select to authenticated using (is_active and public.is_assigned_to(id));
create policy "care_clients: office create" on public.care_clients
  for insert to authenticated with check (public.has_permission('clients.create'));
create policy "care_clients: office edit" on public.care_clients
  for update to authenticated
  using (public.has_permission('clients.edit'))
  with check (public.has_permission('clients.edit'));

create policy "care_assignments: office read" on public.care_assignments
  for select to authenticated using (public.has_permission('clients.view') or public.has_permission('care_ops.view'));
create policy "care_assignments: own read" on public.care_assignments
  for select to authenticated using (worker_id = (select auth.uid()));
create policy "care_assignments: office manage" on public.care_assignments
  for all to authenticated
  using (public.has_permission('clients.edit'))
  with check (public.has_permission('clients.edit'));

create policy "care_reports: office read" on public.care_reports
  for select to authenticated using (public.has_permission('care_ops.view'));
create policy "care_reports: own read" on public.care_reports
  for select to authenticated using (worker_id = (select auth.uid()) and public.is_care_worker());
create policy "care_reports: worker submit" on public.care_reports
  for insert to authenticated
  with check (worker_id = (select auth.uid()) and status = 'submitted' and reviewed_at is null
              and office_note is null and public.is_assigned_to(client_id));
create policy "care_reports: worker correct" on public.care_reports
  for update to authenticated
  using (worker_id = (select auth.uid()) and status = 'submitted' and public.is_care_worker())
  with check (worker_id = (select auth.uid()) and public.is_assigned_to(client_id));
create policy "care_reports: office review" on public.care_reports
  for update to authenticated
  using (public.has_permission('care_ops.edit'))
  with check (public.has_permission('care_ops.edit'));
-- No delete policy: care records are kept.

-- ---------- Grants (cloud projects don't grant automatically) ----------
revoke all on public.care_clients, public.care_assignments, public.care_reports from anon;
grant select, insert, update on public.care_clients, public.care_reports to authenticated;
grant select, insert, update, delete on public.care_assignments to authenticated;
revoke truncate, references, trigger on public.care_clients, public.care_assignments, public.care_reports from authenticated;
grant usage on sequence public.care_report_number_seq to authenticated;
grant all on public.care_clients, public.care_assignments, public.care_reports to service_role;
grant usage on sequence public.care_report_number_seq to service_role;

revoke all on function public.is_care_worker(), public.is_assigned_to(uuid), public.care_report_counts() from public, anon;
grant execute on function public.is_care_worker(), public.is_assigned_to(uuid), public.care_report_counts() to authenticated;
revoke all on function private.guard_care_report() from public;

-- ---------- Audit trail ----------
select private.enable_audit('public.care_clients');
select private.enable_audit('public.care_assignments');
select private.enable_audit('public.care_reports');

-- ---------- Care workers' names for the office ----------
-- Office staff who manage care (clients.view / care_ops.view) can see the profile
-- (name, phone) of care workers, but not of other staff or the public.
create function public.is_worker_profile(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = uid and role_key = 'worker');
$$;
comment on function public.is_worker_profile(uuid) is 'True when the given user has the Worker role. Used by the profiles read policy for office staff.';
revoke all on function public.is_worker_profile(uuid) from public, anon;
grant execute on function public.is_worker_profile(uuid) to authenticated;

create policy "profiles: care office reads care workers" on public.profiles
  for select to authenticated
  using ((public.has_permission('care_ops.view') or public.has_permission('clients.view')) and public.is_worker_profile(id));

-- ---------- Care workers list for the office ----------
create function public.list_care_workers()
returns table (id uuid, full_name text, email text, phone text, is_active boolean, last_report_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.has_permission('clients.view') or public.has_permission('care_ops.view')) then
    raise exception 'You do not have permission to see care workers' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, u.email::text, p.phone, p.is_active,
           (select max(r.submitted_at) from public.care_reports r where r.worker_id = p.id)
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    join auth.users u on u.id = p.id
    where ur.role_key = 'worker'
    order by p.is_active desc, p.full_name;
end;
$$;
revoke all on function public.list_care_workers() from public, anon;
grant execute on function public.list_care_workers() to authenticated;
