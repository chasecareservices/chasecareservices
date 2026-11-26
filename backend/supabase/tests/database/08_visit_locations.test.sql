-- Visit locations recorded with care reports.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'carer@loc.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'ops@loc.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000b1', 'worker'),
  ('00000000-0000-0000-0000-0000000000b2', 'operations_manager');
insert into public.care_clients (id, full_name) values ('00000000-0000-4000-8000-0000000000b9', 'Located Client');
insert into public.care_assignments (client_id, worker_id) values ('00000000-0000-4000-8000-0000000000b9', '00000000-0000-0000-0000-0000000000b1');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated", "aal": "aal1"}';

select lives_ok(
  $$ insert into public.care_reports (id, client_id, mood, summary, location_status, location_lat, location_lng, location_accuracy_m, location_captured_at)
     values ('00000000-0000-4000-8000-0000000000b8', '00000000-0000-4000-8000-0000000000b9', 'good', 'Visit with location recorded.', 'captured', 5.6037, -0.1870, 12, now()) $$,
  'a care worker can send a report with their location');
select throws_ok(
  $$ insert into public.care_reports (client_id, mood, summary, location_status) values ('00000000-0000-4000-8000-0000000000b9', 'good', 'Says captured but no position.', 'captured') $$,
  '23514', null, 'a "captured" location must include the position and time');
select lives_ok(
  $$ insert into public.care_reports (client_id, mood, summary, location_status) values ('00000000-0000-4000-8000-0000000000b9', 'good', 'Location was blocked on the phone.', 'denied') $$,
  'a report can be sent without a location, saying why');
select throws_ok(
  $$ insert into public.care_reports (client_id, mood, summary, location_status, location_lat, location_lng, location_captured_at)
     values ('00000000-0000-4000-8000-0000000000b9', 'good', 'Location time in the future.', 'captured', 5.6, -0.18, now() + interval '1 day') $$,
  '23514', null, 'the location time cannot be after the report was sent');
select throws_ok(
  $$ update public.care_reports set location_lat = 6.7, location_lng = -1.6 where id = '00000000-0000-4000-8000-0000000000b8' $$,
  '42501', null, 'a care worker cannot move the location after sending');
select lives_ok(
  $$ update public.care_reports set summary = 'Visit with location recorded, corrected.' where id = '00000000-0000-4000-8000-0000000000b8' $$,
  'but can still correct the words before the office reads it');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$ update public.care_clients set home_lat = 5.6037, home_lng = -0.1870 where id = '00000000-0000-4000-8000-0000000000b9' $$,
  'the office can set a client''s home location');

select * from finish();
rollback;
