-- Shift schedule: who can see and book visits; done / missed status.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'carer-a@shift.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'carer-b@shift.test'),
  ('00000000-0000-0000-0000-0000000000f3', 'ops@shift.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000f1', 'worker'),
  ('00000000-0000-0000-0000-0000000000f2', 'worker'),
  ('00000000-0000-0000-0000-0000000000f3', 'operations_manager');
insert into public.care_clients (id, full_name) values ('00000000-0000-4000-8000-0000000000e9', 'Shift Client');
insert into public.care_assignments (client_id, worker_id) values
  ('00000000-0000-4000-8000-0000000000e9', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-4000-8000-0000000000e9', '00000000-0000-0000-0000-0000000000f2');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;

-- Office books visits
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ insert into public.care_shifts (id, client_id, worker_id, shift_date, start_time, end_time) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000e9', '00000000-0000-0000-0000-0000000000f1', current_date - 2, '09:00', '12:00'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000e9', '00000000-0000-0000-0000-0000000000f1', current_date - 2, '14:00', '16:00'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000e9', '00000000-0000-0000-0000-0000000000f2', current_date + 3, '09:00', '12:00') $$,
  'the office can book visits');
select throws_ok($$ insert into public.care_shifts (client_id, worker_id, shift_date, start_time, end_time) values
  ('00000000-0000-4000-8000-0000000000e9', '00000000-0000-0000-0000-0000000000f1', current_date, '12:00', '09:00') $$, '23514', null, 'a visit cannot end before it starts');

-- Carer A
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated", "aal": "aal1"}';
select is((select count(*)::int from public.care_shifts), 2, 'a care worker sees only their own visits');
select is_empty($$ update public.care_shifts set start_time = '10:00' returning id $$, 'a care worker cannot change visits');
select lives_ok($$ insert into public.care_reports (id, client_id, mood, summary, visit_date, location_status)
  values ('00000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-0000000000e9', 'good', 'Busy day of visits.', current_date - 2, 'denied') $$,
  'a care worker can send a report for a day with visits');
select throws_ok($$ insert into public.care_reports (client_id, mood, summary, shift_id, location_status)
  values ('00000000-0000-4000-8000-0000000000e9', 'good', 'Claiming someone else''s visit.', '00000000-0000-4000-8000-0000000000a3', 'denied') $$,
  '23514', null, 'a care worker cannot link a report to someone else''s visit');

-- Office sees statuses
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated", "aal": "aal2"}';
select results_eq($$ select visit_status from public.care_shift_status where client_id = '00000000-0000-4000-8000-0000000000e9' order by shift_date, start_time $$,
  array['done', 'done', 'upcoming'], 'an unlinked report that day counts for the worker''s visits that day');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated", "aal": "aal1"}';
update public.care_reports set shift_id = '00000000-0000-4000-8000-0000000000a1' where id = '00000000-0000-4000-8000-0000000000b7';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated", "aal": "aal2"}';
select results_eq($$ select visit_status from public.care_shift_status where client_id = '00000000-0000-4000-8000-0000000000e9' order by shift_date, start_time $$,
  array['done', 'missed', 'upcoming'], 'once the report is linked to the morning visit, the afternoon visit is missed');
select ok((select public.missed_visit_count()) >= 1, 'the dashboard counts missed visits');

select * from finish();
rollback;
