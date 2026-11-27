-- =============================================================================
-- Recruitment pipeline: from job application to placed care worker.
--
-- Stages: registered -> screening -> training -> approved -> placed -> support
-- (or rejected / withdrawn). Each applicant has a checklist. "No placement
-- without preparation": the database refuses Approved or Placed until every
-- required check has passed (not_needed counts for checks that may not apply).
-- Office staff with workforce.* manage it.
-- =============================================================================

create table public.recruitment_applicants (
  id                uuid primary key default gen_random_uuid(),
  enquiry_id        uuid unique references public.enquiries (id) on delete set null,
  full_name         text not null check (char_length(full_name) between 2 and 120),
  email             text check (char_length(email) <= 254),
  phone             text check (char_length(phone) <= 40),
  role_applied      text check (char_length(role_applied) <= 80),
  location          text check (char_length(location) <= 200),
  availability      text check (char_length(availability) <= 200),
  experience        text check (char_length(experience) <= 4000),
  stage             text not null default 'registered'
                      check (stage in ('registered', 'screening', 'training', 'approved', 'placed', 'support', 'rejected', 'withdrawn')),
  stage_changed_at  timestamptz not null default now(),
  worker_id         uuid unique references public.profiles (id) on delete set null,  -- their care worker account, once invited
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.recruitment_applicants is 'People applying to work with Chase Care, and where they are in recruitment.';
create index recruitment_applicants_stage_idx on public.recruitment_applicants (stage, stage_changed_at desc);

create trigger recruitment_applicants_set_updated_at
  before update on public.recruitment_applicants
  for each row execute function private.set_updated_at();

-- The checklist. Keys are fixed so the rule below can rely on them.
create table public.recruitment_checks (
  applicant_id  uuid not null references public.recruitment_applicants (id) on delete cascade,
  check_key     text not null check (check_key in (
                  'interview', 'id_verified', 'references', 'background_check',
                  'safeguarding_training', 'comp_practical', 'comp_communication', 'comp_conduct',
                  'comp_dignity', 'comp_safeguarding', 'comp_documentation', 'comp_emergency')),
  status        text not null check (status in ('pending', 'passed', 'failed', 'not_needed')),
  note          text check (char_length(note) <= 1000),
  checked_by    uuid references auth.users (id) on delete set null,
  checked_at    timestamptz not null default now(),
  primary key (applicant_id, check_key)
);
comment on table public.recruitment_checks is 'Interview, screening and competency checks for each applicant.';

create table public.recruitment_notes (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null references public.recruitment_applicants (id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 4000),
  author_id     uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now()
);
create index recruitment_notes_applicant_idx on public.recruitment_notes (applicant_id, created_at);

-- Checks that must pass before Approved/Placed. Background check and safeguarding
-- training may be marked "not needed" where they don't apply.
create function public.recruitment_missing_checks(applicant uuid)
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(k order by k), '{}')
  from unnest(array['interview', 'id_verified', 'references', 'background_check', 'safeguarding_training',
                    'comp_practical', 'comp_communication', 'comp_conduct', 'comp_dignity',
                    'comp_safeguarding', 'comp_documentation', 'comp_emergency']) as k
  where not exists (
    select 1 from public.recruitment_checks c
    where c.applicant_id = applicant and c.check_key = k
      and (c.status = 'passed' or (c.status = 'not_needed' and k in ('background_check', 'safeguarding_training')))
  );
$$;

create function private.guard_recruitment_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  missing text[];
begin
  if new.stage is distinct from old.stage or tg_op = 'INSERT' then
    if new.stage in ('approved', 'placed', 'support') then
      select coalesce(array_agg(k), '{}') into missing
      from unnest(array['interview', 'id_verified', 'references', 'background_check', 'safeguarding_training',
                        'comp_practical', 'comp_communication', 'comp_conduct', 'comp_dignity',
                        'comp_safeguarding', 'comp_documentation', 'comp_emergency']) as k
      where not exists (
        select 1 from public.recruitment_checks c
        where c.applicant_id = new.id and c.check_key = k
          and (c.status = 'passed' or (c.status = 'not_needed' and k in ('background_check', 'safeguarding_training')))
      );
      if cardinality(missing) > 0 then
        raise exception 'No placement without preparation: % check(s) still to pass', cardinality(missing) using errcode = '23514';
      end if;
    end if;
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$;
create trigger recruitment_applicants_guard_stage
  before insert or update of stage on public.recruitment_applicants
  for each row execute function private.guard_recruitment_stage();

-- Counts for the board and the sidebar.
create function public.recruitment_counts()
returns table (stage text, n bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select stage, count(*) from public.recruitment_applicants group by stage $$;

-- Job applications from the website that aren't in the pipeline yet.
create function public.recruitment_new_applications()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) from public.enquiries e
  where e.enquiry_type = 'worker_application' and e.status not in ('closed', 'converted')
    and not exists (select 1 from public.recruitment_applicants a where a.enquiry_id = e.id);
$$;

-- ---------- Row Level Security ----------
alter table public.recruitment_applicants enable row level security;
alter table public.recruitment_checks enable row level security;
alter table public.recruitment_notes enable row level security;

create policy "recruitment_applicants: read" on public.recruitment_applicants
  for select to authenticated using (public.has_permission('workforce.view'));
create policy "recruitment_applicants: add" on public.recruitment_applicants
  for insert to authenticated with check (public.has_permission('workforce.create'));
create policy "recruitment_applicants: update" on public.recruitment_applicants
  for update to authenticated using (public.has_permission('workforce.edit')) with check (public.has_permission('workforce.edit'));
create policy "recruitment_applicants: delete" on public.recruitment_applicants
  for delete to authenticated using (public.has_permission('workforce.delete'));

create policy "recruitment_checks: read" on public.recruitment_checks
  for select to authenticated using (public.has_permission('workforce.view'));
create policy "recruitment_checks: record" on public.recruitment_checks
  for all to authenticated using (public.has_permission('workforce.edit')) with check (public.has_permission('workforce.edit'));

create policy "recruitment_notes: read" on public.recruitment_notes
  for select to authenticated using (public.has_permission('workforce.view'));
create policy "recruitment_notes: add" on public.recruitment_notes
  for insert to authenticated with check (public.has_permission('workforce.edit') and author_id = (select auth.uid()));

revoke all on public.recruitment_applicants, public.recruitment_checks, public.recruitment_notes from anon;
grant select, insert, update, delete on public.recruitment_applicants, public.recruitment_checks to authenticated;
grant select, insert on public.recruitment_notes to authenticated;
revoke truncate, references, trigger on public.recruitment_applicants, public.recruitment_checks, public.recruitment_notes from authenticated;
grant all on public.recruitment_applicants, public.recruitment_checks, public.recruitment_notes to service_role;
revoke all on function public.recruitment_missing_checks(uuid), public.recruitment_counts(), public.recruitment_new_applications() from public, anon;
grant execute on function public.recruitment_missing_checks(uuid), public.recruitment_counts(), public.recruitment_new_applications() to authenticated;
revoke all on function private.guard_recruitment_stage() from public;

select private.enable_audit('public.recruitment_applicants');
select private.enable_audit('public.recruitment_checks');
