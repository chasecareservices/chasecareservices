-- Care visit reports: who can see, write, correct and review them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'carer-a@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'carer-b@test.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'ops@test.local'),
  ('00000000-0000-0000-0000-0000000000e4', 'editor@test.local');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000e1', 'worker'),
  ('00000000-0000-0000-0000-0000000000e2', 'worker'),
  ('00000000-0000-0000-0000-0000000000e3', 'operations_manager'),
  ('00000000-0000-0000-0000-0000000000e4', 'content_editor');
insert into public.care_clients (id, full_name) values
  ('00000000-0000-4000-8000-0000000000a1', 'Client One'),
  ('00000000-0000-4000-8000-0000000000a2', 'Client Two');
insert into public.care_assignments (client_id, worker_id) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-0000000000e2');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;

-- ---- Carer A (assigned to Client One only) ----
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated", "aal": "aal1"}';
select results_eq($$ select full_name from public.care_clients $$, array['Client One'], 'a care worker sees only the clients assigned to them');
select lives_ok(
  $$ insert into public.care_reports (id, client_id, mood, summary, start_time, end_time)
     values ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'good', 'Helped with lunch and a short walk.', '09:00', '12:00') $$,
  'a care worker can report on their own client (two-step not needed for workers)');
select matches((select reference from public.care_reports where id = '00000000-0000-4000-8000-0000000000f1'), '^CR-\d{6}$', 'reports get a CR- reference');
select throws_ok(
  $$ insert into public.care_reports (client_id, mood, summary) values ('00000000-0000-4000-8000-0000000000a2', 'good', 'Not my client at all.') $$,
  '42501', null, 'a care worker cannot report on someone else''s client');
select throws_ok(
  $$ insert into public.care_reports (client_id, worker_id, mood, summary) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-0000000000e2', 'good', 'Pretending to be carer B.') $$,
  '42501', null, 'a care worker cannot write a report in someone else''s name');
select throws_ok(
  $$ insert into public.care_reports (client_id, mood, summary, concern_level) values ('00000000-0000-4000-8000-0000000000a1', 'low', 'Seemed unwell today.', 'urgent') $$,
  '23514', null, 'an urgent concern must be explained');
select throws_ok(
  $$ insert into public.care_reports (client_id, mood, summary, start_time, end_time) values ('00000000-0000-4000-8000-0000000000a1', 'good', 'Times the wrong way round.', '14:00', '09:00') $$,
  '23514', null, 'the visit cannot end before it starts');
select lives_ok(
  $$ update public.care_reports set summary = 'Helped with lunch, a short walk and her exercises.' where id = '00000000-0000-4000-8000-0000000000f1' $$,
  'a care worker can correct their report before the office reads it');
select throws_ok(
  $$ update public.care_reports set status = 'reviewed' where id = '00000000-0000-4000-8000-0000000000f1' $$,
  '42501', null, 'a care worker cannot mark their own report as read');
select is_empty($$ select id from public.care_reports where client_id = '00000000-0000-4000-8000-0000000000a2' $$, 'a care worker cannot see other workers'' reports');

-- ---- Carer B ----
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.care_reports $$, 'carer B cannot see carer A''s report');
select is_empty($$ update public.care_reports set summary = 'tampered with by carer B' returning id $$, 'carer B cannot change carer A''s report');

-- ---- Office (operations manager) ----
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.care_reports where client_id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2')), 1, 'the office sees every care worker''s reports');
select lives_ok(
  $$ update public.care_reports set status = 'reviewed', office_note = 'Thank you, well done.' where id = '00000000-0000-4000-8000-0000000000f1' $$,
  'the office can mark a report read and leave a note');
select isnt((select reviewed_at from public.care_reports where id = '00000000-0000-4000-8000-0000000000f1'), null, 'reading a report records who and when');
select throws_ok($$ delete from public.care_reports $$, '42501', null, 'nobody can delete care reports');
select isnt_empty($$ select id from public.profiles where id = '00000000-0000-0000-0000-0000000000e1' $$, 'the office can see care workers'' names');
select is_empty($$ select id from public.profiles where id = '00000000-0000-0000-0000-0000000000e4' $$, 'but not other staff members'' profiles');
select is((select count(*)::int from public.list_care_workers() where email like '%@test.local'), 2, 'the office can list the care workers (with their emails)');

-- ---- Carer A again, after the office read it ----
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ update public.care_reports set summary = 'Changing it after it was read.' returning id $$, 'a report cannot be changed once the office has read it');

-- ---- Staff without care permissions ----
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e4", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select id from public.care_reports union all select id from public.care_clients $$, 'other staff (e.g. content editors) cannot see clients or reports');
select throws_ok($$ select * from public.list_care_workers() $$, '42501', null, 'other staff cannot list care workers');

select * from finish();
rollback;
