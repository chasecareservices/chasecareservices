-- Recruitment: permissions and "no placement without preparation".
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'recruit@rec.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'editor@rec.test'),
  ('00000000-0000-0000-0000-0000000000b3', 'carer@rec.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000b1', 'recruitment_officer'),
  ('00000000-0000-0000-0000-0000000000b2', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000b3', 'worker');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ insert into public.recruitment_applicants (id, full_name, role_applied) values ('00000000-0000-4000-8000-0000000000a1', 'Abena Applicant', 'Caregiver') $$, 'the recruitment officer can add an applicant');
select lives_ok($$ update public.recruitment_applicants set stage = 'screening' where id = '00000000-0000-4000-8000-0000000000a1' $$, 'and move them to screening');
select throws_ok($$ update public.recruitment_applicants set stage = 'approved' where id = '00000000-0000-4000-8000-0000000000a1' $$, '23514', null, 'approval is refused while checks are missing');
select throws_ok($$ insert into public.recruitment_applicants (full_name, stage) values ('Skipper', 'placed') $$, '23514', null, 'nobody can be added straight to Placed');

insert into public.recruitment_checks (applicant_id, check_key, status)
select '00000000-0000-4000-8000-0000000000a1', k, 'passed'
from unnest(array['interview', 'id_verified', 'references', 'comp_practical', 'comp_communication', 'comp_conduct', 'comp_dignity', 'comp_safeguarding', 'comp_documentation', 'comp_emergency']) k;
insert into public.recruitment_checks (applicant_id, check_key, status) values
  ('00000000-0000-4000-8000-0000000000a1', 'background_check', 'not_needed'),
  ('00000000-0000-4000-8000-0000000000a1', 'safeguarding_training', 'pending');
select is(public.recruitment_missing_checks('00000000-0000-4000-8000-0000000000a1'), array['safeguarding_training'], 'the missing check is named');
select throws_ok($$ update public.recruitment_applicants set stage = 'approved' where id = '00000000-0000-4000-8000-0000000000a1' $$, '23514', null, 'still refused with one check pending');
update public.recruitment_checks set status = 'passed' where check_key = 'safeguarding_training';
select lives_ok($$ update public.recruitment_applicants set stage = 'approved' where id = '00000000-0000-4000-8000-0000000000a1' $$, 'approved once every check has passed');
select lives_ok($$ insert into public.recruitment_notes (applicant_id, body) values ('00000000-0000-4000-8000-0000000000a1', 'Great interview.') $$, 'notes can be added');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select id from public.recruitment_applicants $$, 'content editors cannot see applicants');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select applicant_id from public.recruitment_checks $$, 'care workers cannot see recruitment checks');

select * from finish();
rollback;
