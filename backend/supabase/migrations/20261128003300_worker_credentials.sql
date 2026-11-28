-- =============================================================================
-- Care worker documents & checks, with expiry reminders [dashboard spec §3.6].
--
--   worker_credentials  one row per document or check (Ghana Card, police check,
--                       first aid, safeguarding, health check, nursing licence…):
--                       reference, issue and expiry dates, and whether the office
--                       has checked it (pending / verified / rejected).
--
-- The office (workforce.*) records and verifies them; the care office can read
-- them (for matching). A care worker can see their own and send renewed details,
-- which arrive as "pending" for the office to check. Files themselves stay in
-- the company Google Drive (care_documents).
-- reminder_stage records which expiry email has gone out (30 days, 7 days, expired),
-- so reminders are sent once each.
-- =============================================================================

create table public.worker_credentials (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references public.profiles (id) on delete cascade,
  doc_type        text not null check (doc_type in (
                    'ghana_card', 'passport', 'police_check', 'first_aid', 'safeguarding',
                    'health_check', 'nursing_licence', 'driving_licence', 'other')),
  title           text check (char_length(title) <= 120),         -- for "other"
  reference       text check (char_length(reference) <= 100),     -- card / certificate number
  issued_on       date,
  expires_on      date check (expires_on is null or issued_on is null or expires_on > issued_on),
  status          text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  note            text check (char_length(note) <= 300),
  submitted_by    uuid references auth.users (id) on delete set null default auth.uid(),
  verified_by     uuid references auth.users (id) on delete set null,
  verified_at     timestamptz,
  reminder_stage  smallint not null default 0 check (reminder_stage between 0 and 3),  -- 1 = 30 days, 2 = 7 days, 3 = expired
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.worker_credentials is 'Care worker documents and checks with expiry dates and verification.';
create index worker_credentials_worker_idx on public.worker_credentials (worker_id, doc_type, expires_on desc);
create index worker_credentials_expiry_idx on public.worker_credentials (expires_on) where status = 'verified';

create trigger worker_credentials_set_updated_at before update on public.worker_credentials
  for each row execute function private.set_updated_at();

-- Verifying records who did it and when; changing the expiry starts the reminders again.
create function private.stamp_credential()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('verified', 'rejected') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    new.verified_by := (select auth.uid());
    new.verified_at := now();
  elsif new.status = 'pending' then
    new.verified_by := null;
    new.verified_at := null;
  end if;
  if tg_op = 'UPDATE' and new.expires_on is distinct from old.expires_on then
    new.reminder_stage := 0;
  end if;
  return new;
end;
$$;
create trigger worker_credentials_stamp before insert or update on public.worker_credentials
  for each row execute function private.stamp_credential();

-- Counts for the dashboard badge: expired or expiring within 30 days (latest verified of
-- each type), plus details waiting to be checked.
create function public.credential_counts()
returns table (expired bigint, expiring bigint, to_check bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    select distinct on (c.worker_id, c.doc_type, coalesce(c.title, '')) c.*
    from public.worker_credentials c
    where c.status = 'verified' and public.is_worker_profile(c.worker_id)
    order by c.worker_id, c.doc_type, coalesce(c.title, ''), c.expires_on desc nulls first
  )
  select (select count(*) from latest where expires_on < (now() at time zone 'UTC')::date),
         (select count(*) from latest where expires_on >= (now() at time zone 'UTC')::date and expires_on <= (now() at time zone 'UTC')::date + 30),
         (select count(*) from public.worker_credentials where status = 'pending');
$$;

-- ---------- Row Level Security ----------
alter table public.worker_credentials enable row level security;

create policy "worker_credentials: office reads" on public.worker_credentials
  for select to authenticated using (public.has_permission('workforce.view') or public.has_permission('care_ops.view'));
create policy "worker_credentials: office adds" on public.worker_credentials
  for insert to authenticated with check (public.has_permission('workforce.edit') and public.is_worker_profile(worker_id));
create policy "worker_credentials: office edits" on public.worker_credentials
  for update to authenticated using (public.has_permission('workforce.edit')) with check (public.has_permission('workforce.edit'));
create policy "worker_credentials: office removes" on public.worker_credentials
  for delete to authenticated using (public.has_permission('workforce.edit'));

create policy "worker_credentials: worker reads own" on public.worker_credentials
  for select to authenticated using (worker_id = (select auth.uid()));
create policy "worker_credentials: worker sends renewed details" on public.worker_credentials
  for insert to authenticated
  with check (worker_id = (select auth.uid()) and public.is_care_worker() and status = 'pending' and reminder_stage = 0);

-- Care workers may also upload their own documents (ID, certificates, checks) to the company Drive.
create policy "care_documents: care workers send their own documents" on public.care_documents
  for insert to authenticated
  with check (worker_id = (select auth.uid()) and uploaded_by = (select auth.uid()) and public.is_care_worker()
              and category in ('identity', 'certificate', 'assessment'));

-- ---------- Grants ----------
revoke all on public.worker_credentials from anon;
grant select, insert, update, delete on public.worker_credentials to authenticated;
revoke truncate, references, trigger on public.worker_credentials from authenticated;
grant all on public.worker_credentials to service_role;
revoke all on function public.credential_counts() from public, anon;
grant execute on function public.credential_counts() to authenticated;
revoke all on function private.stamp_credential() from public;

select private.enable_audit('public.worker_credentials');
