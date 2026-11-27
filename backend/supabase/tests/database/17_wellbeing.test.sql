-- Wellbeing Hub: requests are confidential to the worker and the wellbeing team.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

delete from public.wellbeing_requests;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'carer1@wb.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'carer2@wb.test'),
  ('00000000-0000-0000-0000-0000000000d3', 'officer@wb.test'),
  ('00000000-0000-0000-0000-0000000000d4', 'ops@wb.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000d1', 'worker'),
  ('00000000-0000-0000-0000-0000000000d2', 'worker'),
  ('00000000-0000-0000-0000-0000000000d3', 'wellbeing_officer'),
  ('00000000-0000-0000-0000-0000000000d4', 'operations_manager');
update private.security_settings set require_staff_mfa = true;
insert into public.wellbeing_services (id, name, kind, audience, status) values
  ('00000000-0000-4000-8000-0000000000e1', 'Public counselling', 'counselling', 'public', 'published'),
  ('00000000-0000-4000-8000-0000000000e2', 'Worker lab discount', 'laboratory', 'workers', 'published'),
  ('00000000-0000-4000-8000-0000000000e3', 'Draft insurance', 'insurance', 'public', 'draft');

set local role anon;
select results_eq($$ select name from public.wellbeing_services where id::text like '00000000-0000-4000-8000-0000000000e%' order by name $$, array['Public counselling'], 'the public sees only published public services');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated", "aal": "aal1"}';
select results_eq($$ select name from public.wellbeing_services where id::text like '00000000-0000-4000-8000-0000000000e%' order by name $$, array['Public counselling', 'Worker lab discount'], 'care workers also see services for workers');
select lives_ok($$ insert into public.wellbeing_requests (id, kind, urgency, message) values ('00000000-0000-4000-8000-0000000000f1', 'counselling', 'soon', 'I have been feeling very low since a client passed away.') $$, 'a care worker can ask for support');
select matches((select reference from public.wellbeing_requests where id = '00000000-0000-4000-8000-0000000000f1'), '^WB-\d{5}$', 'the request gets a reference');
select throws_ok($$ insert into public.wellbeing_requests (kind, message, status) values ('health', 'x x', 'closed') $$, '42501', null, 'a worker cannot send a request already closed');
select throws_ok($$ insert into public.wellbeing_requests (worker_id, kind, message) values ('00000000-0000-0000-0000-0000000000d2', 'health', 'pretending') $$, '42501', null, 'nor ask on someone else''s behalf');
select is_empty($$ update public.wellbeing_requests set status = 'closed' returning id $$, 'a worker cannot change the status');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.wellbeing_requests $$, 'another care worker cannot see it');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d4", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select id from public.wellbeing_requests $$, 'the operations manager cannot see it either');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d3", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.wellbeing_requests), 1, 'the wellbeing officer can see it');
select isnt_empty($$ select id from public.profiles where id = '00000000-0000-0000-0000-0000000000d1' $$, 'and the care worker''s name');
select lives_ok($$ update public.wellbeing_requests set status = 'in_progress', assigned_to = '00000000-0000-0000-0000-0000000000d3' where id = '00000000-0000-4000-8000-0000000000f1' $$, 'and take it on');
select throws_ok($$ update public.wellbeing_requests set message = 'changed' where id = '00000000-0000-4000-8000-0000000000f1' $$, '42501', null, 'but the worker''s words cannot be rewritten');
insert into public.wellbeing_messages (request_id, body) values ('00000000-0000-4000-8000-0000000000f1', 'Hello, I can call you tomorrow at 10.');
insert into public.wellbeing_messages (request_id, body, internal) values ('00000000-0000-4000-8000-0000000000f1', 'Refer to grief counsellor.', true);

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated", "aal": "aal1"}';
select results_eq($$ select body from public.wellbeing_messages $$, array['Hello, I can call you tomorrow at 10.'], 'the worker sees the reply but not the internal note');
select lives_ok($$ insert into public.wellbeing_messages (request_id, body) values ('00000000-0000-4000-8000-0000000000f1', 'Thank you, 10 is fine.') $$, 'and can reply');
select throws_ok($$ insert into public.wellbeing_messages (request_id, body, internal) values ('00000000-0000-4000-8000-0000000000f1', 'sneaky', true) $$, '42501', null, 'but cannot write internal notes');

reset role;
select is_empty($$ select 1 from public.audit_log where table_name in ('wellbeing_requests', 'wellbeing_messages') and (coalesce(new_data, '{}') ? 'message' or coalesce(new_data, '{}') ? 'body') $$, 'the activity log never holds what the request or messages say');

select * from finish();
rollback;
