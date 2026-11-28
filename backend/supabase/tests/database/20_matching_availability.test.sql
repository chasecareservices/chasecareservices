-- Matching & availability: who can see and change what.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'carer1@match.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'carer2@match.test'),
  ('00000000-0000-0000-0000-0000000000e3', 'ops@match.test'),
  ('00000000-0000-0000-0000-0000000000e4', 'editor@match.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000e1', 'worker'),
  ('00000000-0000-0000-0000-0000000000e2', 'worker'),
  ('00000000-0000-0000-0000-0000000000e3', 'operations_manager'),
  ('00000000-0000-0000-0000-0000000000e4', 'content_editor');
update private.security_settings set require_staff_mfa = true;
insert into public.courses (id, slug, title, status) values ('00000000-0000-4000-8000-00000000e0c1', 'match-test-course', 'Dementia Care Test', 'published');
insert into public.certificates (user_id, course_id, learner_name, course_title) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-4000-8000-00000000e0c1', 'Carer One', 'Dementia Care Test');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$ insert into public.worker_availability (worker_id, weekday, start_time, end_time) values ('00000000-0000-0000-0000-0000000000e1', 1, '08:00', '14:00') $$, 'a care worker sets when they are free');
select throws_ok($$ insert into public.worker_availability (worker_id, weekday, start_time, end_time) values ('00000000-0000-0000-0000-0000000000e2', 1, '08:00', '14:00') $$, '42501', null, 'but not for someone else');
select lives_ok($$ insert into public.worker_time_off (worker_id, starts_on, ends_on, kind) values ('00000000-0000-0000-0000-0000000000e1', current_date + 10, current_date + 14, 'leave') $$, 'and adds leave');
select throws_ok($$ insert into public.worker_time_off (worker_id, starts_on, ends_on) values ('00000000-0000-0000-0000-0000000000e1', current_date - 10, current_date - 5) $$, '42501', null, 'not in the past');
select throws_ok($$ insert into public.worker_profiles (worker_id, skills) values ('00000000-0000-0000-0000-0000000000e1', array['nursing']) $$, '42501', null, 'workers cannot set their own skills');
select is_empty($$ select * from public.care_worker_certificates() $$, 'nor read the certificate list for matching');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.worker_availability $$, 'workers cannot see each other''s availability');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ insert into public.worker_profiles (worker_id, gender, skills, languages, home_area) values ('00000000-0000-0000-0000-0000000000e1', 'female', array['dementia', 'personal_care'], array['Twi', 'English'], 'Madina') $$, 'the office sets a worker''s matching profile');
select throws_ok($$ insert into public.worker_profiles (worker_id) values ('00000000-0000-0000-0000-0000000000e3') $$, '42501', null, 'only for care workers');
select is((select count(*)::int from public.worker_availability where worker_id = '00000000-0000-0000-0000-0000000000e1'), 1, 'the office sees availability');
select is((select course_title from public.care_worker_certificates() where worker_id = '00000000-0000-0000-0000-0000000000e1'), 'Dementia Care Test', 'and certificates for matching');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e4", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select worker_id from public.worker_profiles $$, 'content editors see nothing');

select * from finish();
rollback;
