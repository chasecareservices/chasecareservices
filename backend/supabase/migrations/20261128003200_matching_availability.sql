-- =============================================================================
-- Care worker matching & availability [§19, §20; dashboard spec §3.7].
--
--   worker_profiles      skills, languages, home area/pin, travel distance, max hours
--   worker_availability  the weekly pattern a worker is usually free (ISO weekday 1 = Monday)
--   worker_time_off      leave, sickness, training: dates a worker can't work
--   care_clients (new)   required_skills, preferred_gender, languages: what the client needs
--
-- The office (care_ops.*) suggests workers for a visit from these, plus each
-- worker's existing visits and ChaseCare Academy certificates.
-- Care workers manage their own availability and time off in their portal.
-- =============================================================================

create table public.worker_profiles (
  worker_id       uuid primary key references public.profiles (id) on delete cascade,
  gender          text check (gender in ('female', 'male')),
  skills          text[] not null default '{}' check (cardinality(skills) <= 30),
  languages       text[] not null default '{}' check (cardinality(languages) <= 12),
  home_area       text check (char_length(home_area) <= 200),
  home_lat        double precision check (home_lat between -90 and 90),
  home_lng        double precision check (home_lng between -180 and 180),
  travel_km       integer not null default 15 check (travel_km between 1 and 500),
  max_hours_week  integer check (max_hours_week between 1 and 84),
  notes           text check (char_length(notes) <= 500),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id) on delete set null,
  constraint worker_profiles_pin check ((home_lat is null) = (home_lng is null))
);
comment on table public.worker_profiles is 'What the office knows about a care worker for matching them to clients.';
create trigger worker_profiles_set_updated_at before update on public.worker_profiles
  for each row execute function private.set_updated_at();

create table public.worker_availability (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references public.profiles (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),   -- 1 = Monday … 7 = Sunday
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);
comment on table public.worker_availability is 'When a care worker is usually free to work, week by week.';
create index worker_availability_worker_idx on public.worker_availability (worker_id, weekday);

create table public.worker_time_off (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references public.profiles (id) on delete cascade,
  starts_on   date not null,
  ends_on     date not null,
  kind        text not null default 'leave' check (kind in ('leave', 'sick', 'training', 'other')),
  note        text check (char_length(note) <= 200),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (ends_on - starts_on <= 366)
);
comment on table public.worker_time_off is 'Dates a care worker cannot work: leave, sickness, training.';
create index worker_time_off_worker_idx on public.worker_time_off (worker_id, starts_on);

alter table public.care_clients
  add column required_skills  text[] not null default '{}' check (cardinality(required_skills) <= 20),
  add column preferred_gender text check (preferred_gender in ('female', 'male')),
  add column languages        text[] not null default '{}' check (cardinality(languages) <= 12);
comment on column public.care_clients.required_skills is 'Skills a care worker needs for this client (matching).';
comment on column public.care_clients.preferred_gender is 'The client or family''s preference for a female or male care worker, if any.';

-- Valid ChaseCare Academy certificates of active care workers, for matching.
-- (The care office doesn't otherwise see the Academy's certificate register.)
create function public.care_worker_certificates()
returns table (worker_id uuid, course_title text, completed_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select c.user_id, c.course_title, c.completed_on
  from public.certificates c
  join public.user_roles ur on ur.user_id = c.user_id and ur.role_key = 'worker'
  where c.revoked_at is null
    and (public.has_permission('care_ops.view') or public.has_permission('workforce.view'));
$$;

-- ---------- Row Level Security ----------
alter table public.worker_profiles enable row level security;
alter table public.worker_availability enable row level security;
alter table public.worker_time_off enable row level security;

create policy "worker_profiles: read own" on public.worker_profiles
  for select to authenticated using (worker_id = (select auth.uid()));
create policy "worker_profiles: office reads" on public.worker_profiles
  for select to authenticated using (public.has_permission('care_ops.view') or public.has_permission('workforce.view'));
create policy "worker_profiles: office edits" on public.worker_profiles
  for all to authenticated
  using (public.has_permission('care_ops.edit') or public.has_permission('workforce.edit'))
  with check ((public.has_permission('care_ops.edit') or public.has_permission('workforce.edit')) and public.is_worker_profile(worker_id));

create policy "worker_availability: worker manages own" on public.worker_availability
  for all to authenticated
  using (worker_id = (select auth.uid()) and public.is_care_worker())
  with check (worker_id = (select auth.uid()) and public.is_care_worker());
create policy "worker_availability: office reads" on public.worker_availability
  for select to authenticated using (public.has_permission('care_ops.view') or public.has_permission('workforce.view'));
create policy "worker_availability: office edits" on public.worker_availability
  for all to authenticated
  using (public.has_permission('care_ops.edit'))
  with check (public.has_permission('care_ops.edit') and public.is_worker_profile(worker_id));

create policy "worker_time_off: worker reads own" on public.worker_time_off
  for select to authenticated using (worker_id = (select auth.uid()));
create policy "worker_time_off: worker adds own" on public.worker_time_off
  for insert to authenticated
  with check (worker_id = (select auth.uid()) and public.is_care_worker() and ends_on >= (now() at time zone 'UTC')::date);
create policy "worker_time_off: worker removes own future" on public.worker_time_off
  for delete to authenticated
  using (worker_id = (select auth.uid()) and starts_on > (now() at time zone 'UTC')::date);
create policy "worker_time_off: office reads" on public.worker_time_off
  for select to authenticated using (public.has_permission('care_ops.view') or public.has_permission('workforce.view'));
create policy "worker_time_off: office edits" on public.worker_time_off
  for all to authenticated
  using (public.has_permission('care_ops.edit'))
  with check (public.has_permission('care_ops.edit') and public.is_worker_profile(worker_id));

-- ---------- Grants ----------
revoke all on public.worker_profiles, public.worker_availability, public.worker_time_off from anon;
grant select, insert, update, delete on public.worker_profiles, public.worker_availability, public.worker_time_off to authenticated;
revoke truncate, references, trigger on public.worker_profiles, public.worker_availability, public.worker_time_off from authenticated;
grant all on public.worker_profiles, public.worker_availability, public.worker_time_off to service_role;
revoke all on function public.care_worker_certificates() from public, anon;
grant execute on function public.care_worker_certificates() to authenticated;

select private.enable_audit('public.worker_profiles');
select private.enable_audit('public.worker_time_off');
