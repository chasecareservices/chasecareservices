-- Online learning: enrolment, lessons, assessment marking and certificates.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'learner@learn.test'),
  ('00000000-0000-0000-0000-0000000000a8', 'other@learn.test'),
  ('00000000-0000-0000-0000-0000000000a9', 'trainer@learn.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000a7', 'learner'),
  ('00000000-0000-0000-0000-0000000000a8', 'learner'),
  ('00000000-0000-0000-0000-0000000000a9', 'training_coordinator');
update public.profiles set full_name = 'Adwoa Learner' where id = '00000000-0000-0000-0000-0000000000a7';
update private.security_settings set require_staff_mfa = true;

insert into public.courses (id, slug, title, status, online_enabled, self_enrol, pass_mark, cpd_hours, certification_type) values
  ('00000000-0000-4000-8000-00000000a001', 'test-online', 'Test Online Course', 'published', true, true, 50, 3, 'cpd'),
  ('00000000-0000-4000-8000-00000000a002', 'test-paid', 'Paid Course', 'published', true, true, 80, null, 'internal');
update public.courses set fee_amount = 200 where id = '00000000-0000-4000-8000-00000000a002';
insert into public.course_lessons (id, course_id, title, sort_order) values
  ('00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000a001', 'Lesson one', 1),
  ('00000000-0000-4000-8000-00000000b002', '00000000-0000-4000-8000-00000000a001', 'Lesson two', 2);
insert into public.course_quiz_questions (course_id, question, options, correct_option, sort_order) values
  ('00000000-0000-4000-8000-00000000a001', 'Question one?', array['a', 'b', 'c'], 1, 1),
  ('00000000-0000-4000-8000-00000000a001', 'Question two?', array['a', 'b'], 0, 2);

set local role anon;
select is((select count(*)::int from public.course_outline('00000000-0000-4000-8000-00000000a001')), 2, 'the public sees the lesson outline');
select throws_ok($$ select title from public.course_lessons $$, '42501', null, 'but not the lessons themselves');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a7", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.course_lessons $$, 'before enrolling, no lessons');
select throws_ok($$ select public.self_enrol('00000000-0000-4000-8000-00000000a002') $$, '42501', null, 'paid courses cannot be self-enrolled');
select lives_ok($$ select public.self_enrol('00000000-0000-4000-8000-00000000a001') $$, 'free courses can');
select is((select count(*)::int from public.course_lessons), 2, 'then the lessons are open');
select is_empty($$ select correct_option from public.course_quiz_questions $$, 'learners cannot read the answers');
select is((select count(*)::int from public.course_quiz('00000000-0000-4000-8000-00000000a001')), 2, 'but can read the questions');
select throws_ok($$ select * from public.submit_quiz('00000000-0000-4000-8000-00000000a001', array[1, 0]) $$, '55000', null, 'the assessment waits until every lesson is done');
select is(public.complete_lesson('00000000-0000-4000-8000-00000000b001'), null, 'finishing a lesson');
select is(public.complete_lesson('00000000-0000-4000-8000-00000000b002'), null, 'finishing the last lesson does not complete a course with an assessment');
select is((select passed from public.submit_quiz('00000000-0000-4000-8000-00000000a001', array[2, 1])), false, 'wrong answers fail');
select results_eq($$ select score, passed from public.submit_quiz('00000000-0000-4000-8000-00000000a001', array[1, 1]) $$, $$ values (1, true) $$, '50% passes with a 50% pass mark');
select matches((select number from public.certificates where user_id = '00000000-0000-0000-0000-0000000000a7'), '^CCS-\d{4}-\d{5}$', 'a numbered certificate is issued');
select is((select learner_name || ' / ' || cpd_hours::text || ' / ' || certification_type::text from public.certificates where user_id = '00000000-0000-0000-0000-0000000000a7'), 'Adwoa Learner / 3.0 / cpd', 'with the learner''s name, CPD hours and type');
select is((select status from public.course_enrolments), 'completed', 'and the course is completed');
select throws_ok($$ insert into public.certificates (learner_name, course_title, issued_by) values ('Fake Name', 'Fake course', '00000000-0000-0000-0000-0000000000a7') $$, '42501', null, 'learners cannot issue certificates');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a8", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.certificates $$, 'other learners cannot see it');

set local role anon;
select throws_ok($$ select verify_code from public.certificates $$, '42501', null, 'visitors cannot list certificates');
select is((select count(*)::int from public.verify_certificate('NOTACODE00')), 0, 'a wrong code finds nothing');
reset role;
select is((select learner_name from public.verify_certificate((select lower(verify_code) from public.certificates where user_id = '00000000-0000-0000-0000-0000000000a7'))), 'Adwoa Learner', 'anyone with the code can verify it');

select * from finish();
rollback;
