-- Care plans: who can read and write them; reports record tasks done.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'carer@plan.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'ops@plan.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'editor@plan.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000c1', 'worker'),
  ('00000000-0000-0000-0000-0000000000c2', 'operations_manager'),
  ('00000000-0000-0000-0000-0000000000c3', 'content_editor');
insert into public.care_clients (id, full_name) values
  ('00000000-0000-4000-8000-0000000000d1', 'Planned Client'),
  ('00000000-0000-4000-8000-0000000000d2', 'Other Client');
insert into public.care_assignments (client_id, worker_id) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-0000000000c1');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;

-- Office writes plans
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ insert into public.care_plans (client_id, visit_tasks, risks) values
  ('00000000-0000-4000-8000-0000000000d1', array['Prepare lunch', 'Walking exercises'], 'Falls risk on the step'),
  ('00000000-0000-4000-8000-0000000000d2', array['Shopping'], null) $$, 'the office can write care plans');
select throws_ok($$ insert into public.care_plans (client_id, visit_tasks) values ('00000000-0000-4000-8000-0000000000d1', array[repeat('x', 201)]) on conflict (client_id) do update set visit_tasks = excluded.visit_tasks $$,
  '23514', null, 'a task cannot be longer than 200 characters');

-- Care worker reads only their own client's plan and cannot change it
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated", "aal": "aal1"}';
select results_eq($$ select risks from public.care_plans $$, array['Falls risk on the step'], 'a care worker sees only the plans of their own clients');
select is_empty($$ update public.care_plans set risks = 'changed' returning client_id $$, 'a care worker cannot change a care plan');
select throws_ok($$ insert into public.care_plans (client_id) values ('00000000-0000-4000-8000-0000000000d2') $$, '42501', null, 'a care worker cannot create a care plan');
select lives_ok($$ insert into public.care_reports (client_id, mood, summary, tasks_done, location_status)
  values ('00000000-0000-4000-8000-0000000000d1', 'good', 'Did lunch and the walking exercises.', array['Prepare lunch', 'Walking exercises'], 'denied') $$,
  'a care worker can record which plan tasks they did');
select is((select tasks_done from public.care_reports where client_id = '00000000-0000-4000-8000-0000000000d1'), array['Prepare lunch', 'Walking exercises'], 'the tasks done are saved with the report');

-- Other staff cannot see care plans
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c3", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select client_id from public.care_plans $$, 'content editors cannot see care plans');

select * from finish();
rollback;
