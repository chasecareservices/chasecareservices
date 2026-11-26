-- Family portal: family see only their own relative, only reviewed reports, and no locations or concerns.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'daughter@family.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'carer@family.test'),
  ('00000000-0000-0000-0000-0000000000f3', 'ops@family.test'),
  ('00000000-0000-0000-0000-0000000000f4', 'stranger@family.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000f1', 'client'),
  ('00000000-0000-0000-0000-0000000000f2', 'worker'),
  ('00000000-0000-0000-0000-0000000000f3', 'operations_manager'),
  ('00000000-0000-0000-0000-0000000000f4', 'client');
update public.profiles set full_name = 'Ama Mensah' where id = '00000000-0000-0000-0000-0000000000f2';
insert into public.care_clients (id, full_name) values
  ('00000000-0000-4000-8000-0000000000e1', 'Mother Client'),
  ('00000000-0000-4000-8000-0000000000e2', 'Someone Else');
insert into public.care_assignments (client_id, worker_id) values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-0000000000f2');
insert into public.care_family_links (client_id, user_id, relationship) values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', 'Daughter');
insert into public.care_reports (client_id, worker_id, visit_date, mood, summary, location_status, location_lat, location_lng, location_accuracy_m, location_captured_at, concern_level, concerns, status) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-0000000000f2', current_date - 1, 'good', 'Read report', 'captured', 5.6, -0.18, 12, now() - interval '1 day', 'monitor', 'Private concern', 'reviewed'),
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-0000000000f2', current_date, 'good', 'Not read yet', 'denied', null, null, null, null, 'none', null, 'submitted'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-0000-0000-0000000000f2', current_date - 1, 'good', 'Other family', 'denied', null, null, null, null, 'none', null, 'reviewed');
insert into public.care_shifts (client_id, worker_id, shift_date, start_time, end_time) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-0000000000f2', current_date + 1, '09:00', '12:00');
insert into public.care_incidents (client_id, reported_by, occurred_at, kind, severity, what_happened, action_taken) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-0000000000f2', now() - interval '1 hour', 'fall', 'minor', 'A small slip in the kitchen.', 'Checked her over.');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated", "aal": "aal1"}';
select results_eq($$ select full_name from public.care_clients $$, array['Mother Client'], 'family see only their own relative');
select results_eq($$ select summary from public.family_visit_reports('00000000-0000-4000-8000-0000000000e1') $$, array['Read report'], 'family see only reports the office has read');
select is((select worker_first_name from public.family_visit_reports('00000000-0000-4000-8000-0000000000e1')), 'Ama', 'family see the care worker''s first name only');
select throws_ok($$ select * from public.family_visit_reports('00000000-0000-4000-8000-0000000000e2') $$, '42501', null, 'family cannot read another family''s reports');
select is_empty($$ select id from public.care_reports $$, 'family cannot read the reports table directly (locations, concerns)');
select is_empty($$ select id from public.care_incidents $$, 'family cannot see incident reports');
select is((select count(*)::int from public.family_visits('00000000-0000-4000-8000-0000000000e1', current_date, current_date + 7)), 1, 'family see upcoming visits');
select isnt(public.family_message_office('00000000-0000-4000-8000-0000000000e1', 'Please could the carer come earlier on Friday?'), null, 'family can message the office');
select throws_ok($$ insert into public.care_family_links (client_id, user_id) values ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'family cannot link themselves to another client');

-- Another family member with the role but no link sees nothing
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f4", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.care_clients $$, 'a family member with no link sees no clients');

-- Office sees the message and the contacts
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.enquiries where source_page = '/family' and payload ->> 'client_id' = '00000000-0000-4000-8000-0000000000e1'), 1, 'the office receives the family message as an enquiry');
select is((select email from public.list_family_contacts('00000000-0000-4000-8000-0000000000e1')), 'daughter@family.test', 'the office sees family contacts with their email');

select * from finish();
rollback;
