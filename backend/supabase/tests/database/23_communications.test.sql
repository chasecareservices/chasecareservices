-- Communications: templates, announcements and policies.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

delete from public.policies; delete from public.portal_announcements;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'carer@comm.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'family@comm.test'),
  ('00000000-0000-0000-0000-0000000000b3', 'editor@comm.test'),
  ('00000000-0000-0000-0000-0000000000b4', 'ops@comm.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000b1', 'worker'),
  ('00000000-0000-0000-0000-0000000000b2', 'client'),
  ('00000000-0000-0000-0000-0000000000b3', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000b4', 'operations_manager');
insert into public.care_clients (id, full_name) values ('00000000-0000-4000-8000-0000000000c9', 'Comm Client');
insert into public.care_family_links (client_id, user_id, relationship) values ('00000000-0000-4000-8000-0000000000c9', '00000000-0000-0000-0000-0000000000b2', 'Son');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ insert into public.email_templates (key, subject) values ('event_reminder', 'See you soon!') $$, 'the content editor can reword an email');
select lives_ok($$ insert into public.portal_announcements (title, body, audience, status) values
  ('For workers', 'Team meeting on Friday.', 'workers', 'published'),
  ('For families', 'Office closed on Monday.', 'families', 'published'),
  ('Draft', 'Not yet.', 'both', 'draft') $$, 'and post announcements');
select lives_ok($$ insert into public.policies (id, title, body, status) values ('00000000-0000-4000-8000-0000000000d1', 'Safeguarding policy', 'Always report concerns.', 'published') $$, 'and publish a policy');
select isnt((select published_at from public.policies where id = '00000000-0000-4000-8000-0000000000d1'), null, 'publishing stamps the date');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated", "aal": "aal1"}';
select results_eq($$ select title from public.portal_announcements $$, array['For workers'], 'care workers see only their published announcements');
select is(public.my_policies_to_read(), 1, 'a care worker has one policy to read');
select is(public.acknowledge_policy('00000000-0000-4000-8000-0000000000d1'), 1, 'and confirms they read version 1');
select is(public.my_policies_to_read(), 0, 'then nothing is left to read');
select is_empty($$ select key from public.email_templates $$, 'care workers cannot see email templates');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated", "aal": "aal1"}';
select results_eq($$ select title from public.portal_announcements $$, array['For families'], 'families see theirs');
select throws_ok($$ select public.acknowledge_policy('00000000-0000-4000-8000-0000000000d1') $$, '42501', null, 'policies are for care workers');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b4", "role": "authenticated", "aal": "aal2"}';
update public.policies set version = 2 where id = '00000000-0000-4000-8000-0000000000d1';
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated", "aal": "aal1"}';
select is(public.my_policies_to_read(), 1, 'a new version must be read again');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b4", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$ update public.policies set version = 1 where id = '00000000-0000-4000-8000-0000000000d1' $$, '23514', null, 'versions never go backwards');

select * from finish();
rollback;
