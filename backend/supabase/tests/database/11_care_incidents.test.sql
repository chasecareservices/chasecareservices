-- Incident reports: who can log, read and follow them up; the record cannot be rewritten.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'carer@incident.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'ops@incident.test'),
  ('00000000-0000-0000-0000-0000000000e3', 'editor@incident.test'),
  ('00000000-0000-0000-0000-0000000000e4', 'carer2@incident.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000e1', 'worker'),
  ('00000000-0000-0000-0000-0000000000e2', 'operations_manager'),
  ('00000000-0000-0000-0000-0000000000e3', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000e4', 'worker');
insert into public.care_clients (id, full_name) values
  ('00000000-0000-4000-8000-0000000000f1', 'Incident Client'),
  ('00000000-0000-4000-8000-0000000000f2', 'Not Their Client');
insert into public.care_assignments (client_id, worker_id) values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-0000-0000-0000000000e1');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;

-- Care worker logs an incident for their client only
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$ insert into public.care_incidents (client_id, occurred_at, kind, severity, what_happened, action_taken, people_told)
  values ('00000000-0000-4000-8000-0000000000f1', now() - interval '1 hour', 'fall', 'moderate', 'Slipped on the bathroom step, bumped her knee.', 'Helped her up, cold compress.', array['family']) $$,
  'a care worker can report an incident for their client');
select throws_ok($$ insert into public.care_incidents (client_id, occurred_at, kind, severity, what_happened, action_taken)
  values ('00000000-0000-4000-8000-0000000000f2', now(), 'fall', 'minor', 'Not my client at all.', 'None') $$, '42501', null, 'a care worker cannot report for a client they do not look after');
select throws_ok($$ insert into public.care_incidents (client_id, occurred_at, kind, severity, what_happened, action_taken, status)
  values ('00000000-0000-4000-8000-0000000000f1', now(), 'fall', 'minor', 'Trying to close it myself.', 'None', 'closed') $$, '42501', null, 'a care worker cannot file an incident as already closed');
select throws_ok($$ insert into public.care_incidents (client_id, occurred_at, kind, severity, what_happened, action_taken)
  values ('00000000-0000-4000-8000-0000000000f1', now() + interval '1 day', 'fall', 'minor', 'This is tomorrow.', 'None') $$, '23514', null, 'an incident cannot be in the future');
select is_empty($$ update public.care_incidents set severity = 'minor' returning id $$, 'a care worker cannot change an incident after sending it');
select matches((select reference from public.care_incidents limit 1), '^IR-\d{6}$', 'incidents get an IR- reference');

-- Another care worker cannot see it
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e4", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.care_incidents $$, 'other care workers cannot see the incident');

-- Office follows up
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated", "aal": "aal2"}';
select results_eq($$ select open::int, serious_open::int from public.care_incident_counts() $$, $$ values (1, 0) $$, 'the office sees the open incident count');
select throws_ok($$ update public.care_incidents set what_happened = 'Rewritten by the office' $$, '42501', null, 'nobody can rewrite what was reported');
update public.care_incidents set status = 'closed', office_notes = 'Family informed; grab rail fitted.';
select is((select closed_by from public.care_incidents limit 1), '00000000-0000-0000-0000-0000000000e2'::uuid, 'closing records who closed it');

-- Content editors see nothing
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select id from public.care_incidents $$, 'content editors cannot see incidents');

select * from finish();
rollback;
