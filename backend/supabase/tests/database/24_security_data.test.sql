-- Security & data requests.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner@sec.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'ops@sec.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'carer@sec.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000c1', 'super_admin'),
  ('00000000-0000-0000-0000-0000000000c2', 'operations_manager'),
  ('00000000-0000-0000-0000-0000000000c3', 'worker');
update private.security_settings set require_staff_mfa = true;

-- Website data for one person.
select public.submit_enquiry('care_request', 'Esi Erase', true, 'esi.erase@example.com', '+233 20 000 0000', 'Ghana', null, 'Please help my mother.');
insert into public.newsletter_subscribers (email, full_name, status) values ('esi.erase@example.com', 'Esi Erase', 'subscribed');
insert into public.recruitment_applicants (id, full_name, email) values ('00000000-0000-4000-8000-0000000000e9', 'Esi Erase', 'esi.erase@example.com');
insert into public.recruitment_checks (applicant_id, check_key, status) values ('00000000-0000-4000-8000-0000000000e9', 'interview', 'passed');
-- An old closed enquiry for retention.
insert into public.enquiries (enquiry_type, status, full_name, email, consent_given, updated_at) values ('contact', 'closed', 'Old Enquiry', 'old@example.com', true, now() - interval '3 years');
alter table public.enquiries disable trigger user;
update public.enquiries set updated_at = now() - interval '3 years' where email = 'old@example.com';
alter table public.enquiries enable trigger user;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$ select public.person_data('esi.erase@example.com') $$, '42501', null, 'the operations manager cannot look up personal data');
select throws_ok($$ select public.erase_person('esi.erase@example.com') $$, '42501', null, 'nor erase it');
select is_empty($$ select * from public.login_history() $$, 'nor see login history');
select is((select staff_idle_minutes from public.security_options()), 30, 'staff can read the idle time-out');
select throws_ok($$ select public.set_security_options(10, 24) $$, '42501', null, 'but not change it');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated", "aal": "aal2"}';
select is(jsonb_array_length(public.person_data('ESI.ERASE@example.com') -> 'enquiries'), 1, 'the owner finds the enquiry (any letter case)');
select is(public.person_data('esi.erase@example.com') -> 'newsletter' ->> 'status', 'subscribed', 'and the newsletter sign-up');
select is(jsonb_array_length(public.person_data('esi.erase@example.com') -> 'job_applications' -> 0 -> 'checks'), 1, 'and the job application with its checks');
select throws_ok($$ select public.person_data('not an email') $$, '22023', null, 'an email address is required');

select is(public.erase_person('esi.erase@example.com') ->> 'enquiries', '1', 'erasing removes the enquiry');
select is((select count(*)::int from public.enquiries where email = 'esi.erase@example.com') + (select count(*)::int from public.newsletter_subscribers where email = 'esi.erase@example.com') + (select count(*)::int from public.recruitment_applicants where email = 'esi.erase@example.com'), 0, 'and every website record of them');
reset role;
select is_empty($$ select id from public.audit_log where coalesce(new_data, old_data)::text ilike '%esi.erase@example.com%' or coalesce(new_data, old_data)::text ilike '%Esi Erase%' $$, 'and the activity-log copies');
select is((select count(*)::int from public.audit_log where table_name = 'personal_data_erasure'), 1, 'while recording that an erasure happened');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated", "aal": "aal2"}';

select is(public.apply_retention() ->> 'enquiries', '1', 'retention removes the old closed enquiry');
select lives_ok($$ select public.set_security_options(15, 12) $$, 'the owner changes the security settings');

select * from finish();
rollback;
