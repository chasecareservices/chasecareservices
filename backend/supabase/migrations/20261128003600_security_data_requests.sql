-- =============================================================================
-- Security & data requests [dashboard spec §3.16; proposal §31].
--
--   security settings   staff_idle_minutes (sign out the dashboard after inactivity)
--                       and retention_enquiry_months (delete old closed enquiries)
--   login_history()     sign-ins, sign-outs and password resets from Supabase Auth
--   user_sessions()     who is signed in now, where; end_user_sessions() signs out
--   data_requests       a log of privacy requests (access, erasure, correction…)
--   person_data(email)  everything held about one email address, for an access request
--   erase_person(email) deletes their website data (enquiries, newsletter, event
--                       sign-ups, job applications) and its copies in the activity
--                       log. Accounts and care records are kept: they are handled
--                       separately because care records must be retained.
--   apply_retention()   deletes closed enquiries older than the retention period,
--                       unconfirmed newsletter sign-ups and old event sign-ups.
-- Owner-level: users.view to see, users.edit to act.
-- =============================================================================

alter table private.security_settings
  add column staff_idle_minutes integer not null default 30 check (staff_idle_minutes between 5 and 480),
  add column retention_enquiry_months integer check (retention_enquiry_months is null or retention_enquiry_months between 6 and 120);
update private.security_settings set retention_enquiry_months = 24;

create function public.security_options()
returns table (require_staff_mfa boolean, staff_idle_minutes integer, retention_enquiry_months integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.require_staff_mfa, s.staff_idle_minutes, s.retention_enquiry_months
  from private.security_settings s
  where public.is_staff();
$$;

create function public.set_security_options(idle_minutes integer, retention_months integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.edit') then
    raise exception 'Only the owner can change security settings' using errcode = '42501';
  end if;
  update private.security_settings set staff_idle_minutes = idle_minutes, retention_enquiry_months = retention_months
  where true;  -- one-row table (the API refuses an UPDATE without WHERE)
  insert into public.audit_log (actor_id, action, table_name, record_id, new_data)
  values ((select auth.uid()), 'UPDATE', 'security_settings', 'security',
          jsonb_build_object('staff_idle_minutes', idle_minutes, 'retention_enquiry_months', retention_months));
end;
$$;

-- ---------- Login history & sessions ----------
create function public.login_history(for_user uuid default null, max_rows integer default 300)
returns table (at timestamptz, user_id uuid, email text, full_name text, action text, ip text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.created_at, (a.payload ->> 'actor_id')::uuid, a.payload ->> 'actor_username', p.full_name,
         a.payload ->> 'action', nullif(a.ip_address, '')
  from auth.audit_log_entries a
  left join public.profiles p on p.id::text = a.payload ->> 'actor_id'
  where public.has_permission('users.view')
    and a.payload ->> 'action' in ('login', 'logout', 'user_recovery_requested', 'user_updated_password', 'user_invited', 'user_signedup', 'token_revoked')
    and (for_user is null or a.payload ->> 'actor_id' = for_user::text)
  order by a.created_at desc
  limit least(greatest(max_rows, 1), 1000);
$$;

create function public.user_sessions()
returns table (session_id uuid, user_id uuid, email text, full_name text, started_at timestamptz, last_active timestamptz, user_agent text, ip text, two_step boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.user_id, u.email, p.full_name, s.created_at, coalesce(s.refreshed_at, s.updated_at, s.created_at),
         s.user_agent, host(s.ip), s.aal::text = 'aal2'
  from auth.sessions s
  join auth.users u on u.id = s.user_id
  left join public.profiles p on p.id = s.user_id
  where public.has_permission('users.view') and (s.not_after is null or s.not_after > now())
  order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc;
$$;

-- Signs someone out on every device (e.g. a lost phone). They can sign in again with their password.
create function public.end_user_sessions(target uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not public.has_permission('users.edit') then
    raise exception 'Only the owner can sign people out' using errcode = '42501';
  end if;
  delete from auth.sessions where user_id = target;
  get diagnostics n = row_count;
  insert into public.audit_log (actor_id, action, table_name, record_id, new_data)
  values ((select auth.uid()), 'DELETE', 'sessions', target::text, jsonb_build_object('sessions_ended', n));
  return n;
end;
$$;

-- ---------- Data requests log ----------
create table public.data_requests (
  id            uuid primary key default gen_random_uuid(),
  person_name   text not null check (char_length(person_name) between 2 and 120),
  person_email  text check (char_length(person_email) <= 254),
  kind          text not null check (kind in ('access', 'erasure', 'correction', 'objection', 'other')),
  details       text check (char_length(details) <= 2000),
  received_on   date not null default (now() at time zone 'UTC')::date,
  due_on        date not null default ((now() at time zone 'UTC')::date + 30),
  status        text not null default 'open' check (status in ('open', 'done', 'declined')),
  outcome       text check (char_length(outcome) <= 2000),
  handled_by    uuid references auth.users (id) on delete set null,
  completed_at  timestamptz,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.data_requests is 'Privacy requests (access, erasure, correction) and what was done about them.';
create trigger data_requests_set_updated_at before update on public.data_requests
  for each row execute function private.set_updated_at();

-- ---------- What we hold about one email address ----------
create function public.person_data(lookup text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e   text := lower(trim(lookup));
  uid uuid;
  out jsonb;
begin
  if not public.has_permission('users.view') then
    raise exception 'Owner access needed' using errcode = '42501';
  end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter an email address' using errcode = '22023';
  end if;
  select id into uid from auth.users where lower(email) = e;

  out := jsonb_build_object(
    'email', e,
    'exported_at', now(),
    'enquiries', coalesce((select jsonb_agg(jsonb_build_object(
        'received', q.created_at, 'type', q.enquiry_type, 'status', q.status, 'name', q.full_name, 'phone', q.phone,
        'country', q.country, 'subject', q.subject, 'message', q.message, 'details', q.payload,
        'office_notes', coalesce((select jsonb_agg(jsonb_build_object('at', n.created_at, 'note', n.body) order by n.created_at)
                                  from public.enquiry_notes n where n.enquiry_id = q.id), '[]'))
        order by q.created_at) from public.enquiries q where lower(q.email) = e), '[]'),
    'newsletter', (select jsonb_build_object('status', s.status, 'name', s.full_name, 'signed_up', s.created_at, 'confirmed', s.confirmed_at, 'unsubscribed', s.unsubscribed_at)
                   from public.newsletter_subscribers s where s.email = e),
    'event_registrations', coalesce((select jsonb_agg(jsonb_build_object(
        'event', ev.title, 'date', ev.starts_at, 'name', r.full_name, 'phone', r.phone, 'joining', r.attend_mode,
        'organisation', r.organisation, 'notes', r.needs, 'status', r.status, 'registered', r.created_at) order by r.created_at)
        from public.event_registrations r join public.community_events ev on ev.id = r.event_id where lower(r.email) = e), '[]'),
    'job_applications', coalesce((select jsonb_agg(jsonb_build_object(
        'applied', a.created_at, 'name', a.full_name, 'phone', a.phone, 'role', a.role_applied, 'location', a.location,
        'availability', a.availability, 'experience', a.experience, 'stage', a.stage,
        'checks', coalesce((select jsonb_agg(jsonb_build_object('check', c.check_key, 'status', c.status, 'note', c.note)) from public.recruitment_checks c where c.applicant_id = a.id), '[]'),
        'office_notes', coalesce((select jsonb_agg(jsonb_build_object('at', n.created_at, 'note', n.body)) from public.recruitment_notes n where n.applicant_id = a.id), '[]'))
        order by a.created_at) from public.recruitment_applicants a where lower(a.email) = e), '[]'),
    'account', case when uid is null then null else jsonb_build_object(
        'created', (select created_at from auth.users where id = uid),
        'last_sign_in', (select last_sign_in_at from auth.users where id = uid),
        'profile', (select jsonb_build_object('name', p.full_name, 'phone', p.phone, 'active', p.is_active) from public.profiles p where p.id = uid),
        'roles', coalesce((select jsonb_agg(r.role_key) from public.user_roles r where r.user_id = uid), '[]'),
        'family_of', coalesce((select jsonb_agg(jsonb_build_object('client', c.full_name, 'relationship', l.relationship))
                               from public.care_family_links l join public.care_clients c on c.id = l.client_id where l.user_id = uid), '[]'),
        'worker_profile', (select to_jsonb(w) - 'worker_id' - 'updated_by' from public.worker_profiles w where w.worker_id = uid),
        'availability', coalesce((select jsonb_agg(jsonb_build_object('weekday', a.weekday, 'from', a.start_time, 'to', a.end_time)) from public.worker_availability a where a.worker_id = uid), '[]'),
        'time_off', coalesce((select jsonb_agg(jsonb_build_object('from', t.starts_on, 'to', t.ends_on, 'kind', t.kind, 'note', t.note)) from public.worker_time_off t where t.worker_id = uid), '[]'),
        'documents_and_checks', coalesce((select jsonb_agg(jsonb_build_object('type', c.doc_type, 'reference', c.reference, 'issued', c.issued_on, 'expires', c.expires_on, 'status', c.status)) from public.worker_credentials c where c.worker_id = uid), '[]'),
        'courses', coalesce((select jsonb_agg(jsonb_build_object('course', co.title, 'status', en.status, 'enrolled', en.enrolled_at, 'completed', en.completed_at))
                             from public.course_enrolments en join public.courses co on co.id = en.course_id where en.user_id = uid), '[]'),
        'certificates', coalesce((select jsonb_agg(jsonb_build_object('number', c.number, 'course', c.course_title, 'completed', c.completed_on, 'revoked', c.revoked_at is not null)) from public.certificates c where c.user_id = uid), '[]'),
        'wellbeing_requests', coalesce((select jsonb_agg(jsonb_build_object('reference', w.reference, 'kind', w.kind, 'sent', w.created_at, 'message', w.message, 'status', w.status)) from public.wellbeing_requests w where w.worker_id = uid), '[]'),
        'policies_read', coalesce((select jsonb_agg(jsonb_build_object('policy', po.title, 'version', a.version, 'at', a.acknowledged_at))
                                   from public.policy_acknowledgements a join public.policies po on po.id = a.policy_id where a.user_id = uid), '[]'),
        'care_records', jsonb_build_object(
            'visit_reports_written', (select count(*) from public.care_reports r where r.worker_id = uid),
            'visits_booked', (select count(*) from public.care_shifts s where s.worker_id = uid),
            'incident_reports_written', (select count(*) from public.care_incidents i where i.reported_by = uid),
            'note', 'Care records are about the clients and are kept under the care-records retention rules. Ask the office for copies of specific records.')
      ) end
  );
  return out;
end;
$$;

-- ---------- Erasure ----------
-- Removes the audit-log copies of rows that were deleted for privacy reasons.
create function private.scrub_audit(tables text[], ids text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if coalesce(array_length(ids, 1), 0) = 0 then return 0; end if;
  -- Rows are matched by their own id, or by the enquiry / application they belonged to
  -- (checks and notes are logged against their parent).
  delete from public.audit_log
  where table_name = any (tables)
    and (record_id = any (ids)
         or coalesce(new_data, old_data) ->> 'enquiry_id' = any (ids)
         or coalesce(new_data, old_data) ->> 'applicant_id' = any (ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

create function public.erase_person(lookup text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e        text := lower(trim(lookup));
  enq      text[];
  notes    text[];
  subs     text[];
  regs     text[];
  apps     text[];
  uid      uuid;
  summary  jsonb;
begin
  if not public.has_permission('users.edit') then
    raise exception 'Only the owner can erase personal data' using errcode = '42501';
  end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter an email address' using errcode = '22023';
  end if;

  select coalesce(array_agg(id::text), '{}') into enq from public.enquiries where lower(email) = e;
  select coalesce(array_agg(n.id::text), '{}') into notes from public.enquiry_notes n where n.enquiry_id::text = any (enq);
  select coalesce(array_agg(id::text), '{}') into subs from public.newsletter_subscribers where email = e;
  select coalesce(array_agg(id::text), '{}') into regs from public.event_registrations where lower(email) = e;
  -- Applications that became a care worker account are kept with the account.
  select coalesce(array_agg(id::text), '{}') into apps from public.recruitment_applicants where lower(email) = e and worker_id is null;

  delete from public.enquiries where id::text = any (enq);
  delete from public.newsletter_subscribers where id::text = any (subs);
  delete from public.event_registrations where id::text = any (regs);
  delete from public.recruitment_applicants where id::text = any (apps);

  -- The activity log kept copies of these rows (including the deletions just made): remove them.
  perform private.scrub_audit(array['enquiries', 'enquiry_notes'], enq || notes);
  perform private.scrub_audit(array['newsletter_subscribers'], subs);
  perform private.scrub_audit(array['event_registrations'], regs);
  perform private.scrub_audit(array['recruitment_applicants', 'recruitment_checks', 'recruitment_notes'], apps);

  select id into uid from auth.users where lower(email) = e;
  summary := jsonb_build_object(
    'enquiries', coalesce(array_length(enq, 1), 0),
    'newsletter', coalesce(array_length(subs, 1), 0),
    'event_registrations', coalesce(array_length(regs, 1), 0),
    'job_applications', coalesce(array_length(apps, 1), 0),
    'has_account', uid is not null,
    'account_roles', coalesce((select jsonb_agg(role_key) from public.user_roles where user_id = uid), '[]')
  );
  -- A record that an erasure happened, without the person's details.
  insert into public.audit_log (actor_id, action, table_name, record_id, new_data)
  values ((select auth.uid()), 'DELETE', 'personal_data_erasure', null, summary - 'account_roles');
  return summary;
end;
$$;

-- ---------- Retention ----------
create function public.apply_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  months integer;
  enq    text[];
  notes  text[];
  subs   text[];
  regs   text[];
begin
  if not (public.has_permission('users.edit') or coalesce((select auth.role()), '') = 'service_role') then
    raise exception 'Only the owner can run retention' using errcode = '42501';
  end if;
  select retention_enquiry_months into months from private.security_settings;
  if months is null then
    return jsonb_build_object('skipped', 'retention is switched off');
  end if;
  -- Closed or converted enquiries untouched for the retention period (converted ones live on as clients/applicants).
  select coalesce(array_agg(id::text), '{}') into enq from public.enquiries
  where status in ('closed', 'converted') and updated_at < now() - make_interval(months => months);
  select coalesce(array_agg(n.id::text), '{}') into notes from public.enquiry_notes n where n.enquiry_id::text = any (enq);
  -- Newsletter sign-ups never confirmed within 30 days.
  select coalesce(array_agg(id::text), '{}') into subs from public.newsletter_subscribers
  where status = 'pending' and created_at < now() - interval '30 days';
  -- Registrations for events that ended more than the retention period ago.
  select coalesce(array_agg(r.id::text), '{}') into regs from public.event_registrations r join public.community_events ev on ev.id = r.event_id
  where coalesce(ev.ends_at, ev.starts_at) < now() - make_interval(months => months);

  delete from public.enquiries where id::text = any (enq);
  delete from public.newsletter_subscribers where id::text = any (subs);
  delete from public.event_registrations where id::text = any (regs);
  perform private.scrub_audit(array['enquiries', 'enquiry_notes'], enq || notes);
  perform private.scrub_audit(array['newsletter_subscribers'], subs);
  perform private.scrub_audit(array['event_registrations'], regs);
  return jsonb_build_object('enquiries', coalesce(array_length(enq, 1), 0), 'newsletter', coalesce(array_length(subs, 1), 0), 'event_registrations', coalesce(array_length(regs, 1), 0), 'months', months);
end;
$$;

-- ---------- Row Level Security & grants ----------
alter table public.data_requests enable row level security;
create policy "data_requests: owner reads" on public.data_requests
  for select to authenticated using (public.has_permission('users.view'));
create policy "data_requests: owner writes" on public.data_requests
  for all to authenticated using (public.has_permission('users.edit')) with check (public.has_permission('users.edit'));

revoke all on public.data_requests from anon;
grant select, insert, update, delete on public.data_requests to authenticated;
revoke truncate, references, trigger on public.data_requests from authenticated;
grant all on public.data_requests to service_role;

revoke all on function public.security_options(), public.set_security_options(integer, integer), public.login_history(uuid, integer),
  public.user_sessions(), public.end_user_sessions(uuid), public.person_data(text), public.erase_person(text), public.apply_retention() from public, anon;
grant execute on function public.security_options(), public.set_security_options(integer, integer), public.login_history(uuid, integer),
  public.user_sessions(), public.end_user_sessions(uuid), public.person_data(text), public.erase_person(text), public.apply_retention() to authenticated;
grant execute on function public.apply_retention() to service_role;
revoke all on function private.scrub_audit(text[], text[]) from public;

select private.enable_audit('public.data_requests');
