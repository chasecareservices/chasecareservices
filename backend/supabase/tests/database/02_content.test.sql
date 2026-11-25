-- Website content: public visibility, publishing rules, editing permissions, revisions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'trainer@test.local');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000b1', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000b2', 'training_coordinator');
update private.security_settings set require_staff_mfa = true;

-- Fixtures.
insert into public.pages (slug, title, status) values
  ('test-published', 'Published page', 'published'),
  ('test-draft', 'Draft page', 'draft');
insert into public.posts (slug, title, status, published_at) values
  ('test-live-post', 'Live', 'published', now() - interval '1 day'),
  ('test-scheduled-post', 'Scheduled', 'published', now() + interval '7 days');

-- Publishing rules (as the table owner, so only constraints apply).
select throws_ok(
  $$ insert into public.testimonials (author_name, quote, status) values ('A', 'Great care', 'published') $$,
  '23514', null, 'a testimonial cannot be published without recorded consent');
select lives_ok(
  $$ insert into public.testimonials (author_name, quote, status, consent_obtained, consent_recorded_at)
     values ('B', 'Great care', 'published', true, now()) $$,
  'a testimonial with recorded consent can be published');
select throws_ok(
  $$ insert into public.partners (name, partner_type, status) values ('Lab Co', 'laboratory', 'published') $$,
  '23514', null, 'a partner cannot be published without display permission');
select throws_ok(
  $$ insert into public.courses (slug, title, certification_type) values ('test-course', 'Test', 'externally_accredited') $$,
  '23514', null, 'a course cannot be marked externally accredited without accreditation details');
select lives_ok(
  $$ insert into public.courses (slug, title, certification_type, accrediting_body, accreditation_reference)
     values ('test-course-2', 'Test 2', 'externally_accredited', 'Example Body', 'REF-123') $$,
  'an accredited course with recorded accreditation is allowed');

-- Public visitor.
set local role anon;
select is((select count(*)::int from public.pages where slug like 'test-%'), 1, 'visitors see published pages only');
select is((select count(*)::int from public.posts where slug like 'test-%'), 1, 'visitors do not see scheduled (future) posts');
select is((select count(*)::int from public.courses where status = 'draft'), 0, 'visitors do not see draft courses');
select throws_ok($$ select count(*) from public.page_revisions $$, '42501', null, 'visitors cannot read page history');
select throws_ok(
  $$ insert into public.pages (slug, title) values ('test-hack', 'Nope') $$,
  '42501', null, 'visitors cannot create pages');

-- Content editor (two-factor).
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.pages where slug like 'test-%'), 2, 'editors see draft pages');
update public.pages set title = 'Draft page (edited)' where slug = 'test-draft';
select is(
  (select snapshot ->> 'title' from public.page_revisions r join public.pages p on p.id = r.page_id
   where p.slug = 'test-draft' order by r.id desc limit 1),
  'Draft page', 'editing a page saves the previous version');
select is_empty(
  $$ update public.courses set title = 'x' where slug = 'test-course-2' returning id $$,
  'content editors cannot edit academy courses');

-- Training coordinator can edit courses.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated", "aal": "aal2"}';
select isnt_empty(
  $$ update public.courses set summary = 'Updated' where slug = 'test-course-2' returning id $$,
  'training coordinators can edit academy courses');

select * from finish();
rollback;
