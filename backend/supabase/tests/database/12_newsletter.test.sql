-- Newsletter: visitors cannot read or add subscribers directly; staff access by permission.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'editor@news.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'ops@news.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000a1', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000a2', 'operations_manager');
update private.security_settings set require_staff_mfa = true;
insert into public.newsletter_subscribers (email, status) values ('reader@example.com', 'subscribed'), ('waiting@example.com', 'pending');

select throws_ok($$ insert into public.newsletter_subscribers (email) values ('Mixed@Example.com') $$, '23514', null, 'emails are stored in lower case');

set local role anon;
select throws_ok($$ select * from public.newsletter_subscribers $$, '42501', null, 'visitors cannot read the subscriber list');
select throws_ok($$ insert into public.newsletter_subscribers (email) values ('bot@example.com') $$, '42501', null, 'visitors cannot add subscribers directly');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select id from public.newsletter_subscribers $$, 'care staff cannot see subscribers');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "aal": "aal2"}';
select results_eq($$ select subscribed::int, pending::int from public.newsletter_counts() $$, $$ values (1, 1) $$, 'the content editor sees the counts');
select lives_ok($$ insert into public.newsletter_sends (post_id, sent_by) select id, '00000000-0000-0000-0000-0000000000a1' from public.posts limit 1 $$, 'the content editor can record a send');
select throws_ok($$ insert into public.newsletter_sends (post_id, sent_by) select post_id, sent_by from public.newsletter_sends limit 1 $$, '23505', null, 'an article cannot be sent twice');
select lives_ok($$ delete from public.newsletter_subscribers where email = 'waiting@example.com' $$, 'the content editor can remove someone');

select * from finish();
rollback;
