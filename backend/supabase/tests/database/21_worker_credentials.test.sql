-- Worker documents & checks: who records, verifies and sees them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

delete from public.worker_credentials;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'carer1@cred.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'carer2@cred.test'),
  ('00000000-0000-0000-0000-0000000000f3', 'recruit@cred.test'),
  ('00000000-0000-0000-0000-0000000000f4', 'editor@cred.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000f1', 'worker'),
  ('00000000-0000-0000-0000-0000000000f2', 'worker'),
  ('00000000-0000-0000-0000-0000000000f3', 'recruitment_officer'),
  ('00000000-0000-0000-0000-0000000000f4', 'content_editor');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ insert into public.worker_credentials (id, worker_id, doc_type, expires_on, status) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'police_check', current_date - 3, 'verified'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-0000-0000-0000000000f1', 'first_aid', current_date + 20, 'verified') $$, 'the office records checked documents');
select isnt((select verified_by from public.worker_credentials where id = '00000000-0000-4000-8000-0000000000c1'), null, 'and who checked them is stamped');
select results_eq($$ select expired, expiring, to_check from public.credential_counts() $$, $$ values (1::bigint, 1::bigint, 0::bigint) $$, 'the dashboard counts expired and expiring');
select throws_ok($$ insert into public.worker_credentials (worker_id, doc_type) values ('00000000-0000-0000-0000-0000000000f3', 'police_check') $$, '42501', null, 'only for care workers');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated", "aal": "aal1"}';
select is((select count(*)::int from public.worker_credentials), 2, 'a care worker sees their own');
select lives_ok($$ insert into public.worker_credentials (worker_id, doc_type, reference, expires_on) values ('00000000-0000-0000-0000-0000000000f1', 'police_check', 'PC-2027', current_date + 365) $$, 'and sends renewed details');
select throws_ok($$ insert into public.worker_credentials (worker_id, doc_type, status) values ('00000000-0000-0000-0000-0000000000f1', 'first_aid', 'verified') $$, '42501', null, 'but cannot mark them checked');
select is_empty($$ update public.worker_credentials set status = 'verified' returning id $$, 'nor change existing ones');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.worker_credentials $$, 'other workers see nothing');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated", "aal": "aal2"}';
update public.worker_credentials set reminder_stage = 2 where id = '00000000-0000-4000-8000-0000000000c2';
update public.worker_credentials set expires_on = current_date + 400 where id = '00000000-0000-4000-8000-0000000000c2';
select is((select reminder_stage::int from public.worker_credentials where id = '00000000-0000-4000-8000-0000000000c2'), 0, 'a new expiry date restarts the reminders');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000f4", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select id from public.worker_credentials $$, 'content editors see nothing');

select * from finish();
rollback;
