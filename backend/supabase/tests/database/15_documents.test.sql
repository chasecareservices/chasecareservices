-- Documents: who can list, add and remove files; the Drive sign-in is server-only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'ops@docs.test'),
  ('00000000-0000-0000-0000-0000000000d2', 'carer@docs.test'),
  ('00000000-0000-0000-0000-0000000000d3', 'editor@docs.test'),
  ('00000000-0000-0000-0000-0000000000d4', 'family@docs.test');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000d1', 'operations_manager'),
  ('00000000-0000-0000-0000-0000000000d2', 'worker'),
  ('00000000-0000-0000-0000-0000000000d3', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000d4', 'client');
insert into public.care_clients (id, full_name) values ('00000000-0000-4000-8000-00000000d0c1', 'Doc Client'), ('00000000-0000-4000-8000-00000000d0c2', 'Other Client');
insert into public.care_assignments (client_id, worker_id) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-0000-0000-0000000000d2');
insert into public.care_family_links (client_id, user_id) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-0000-0000-0000000000d4');
update private.security_settings set require_staff_mfa = true;
delete from public.care_documents; delete from private.drive_connection; -- start clean; rolled back at the end

set local role authenticated;
-- Office adds a client file and a care worker file
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ insert into public.care_documents (client_id, drive_file_id, name, mime_type, size_bytes, category)
  values ('00000000-0000-4000-8000-00000000d0c1', 'f-assess', 'Assessment.pdf', 'application/pdf', 1000, 'assessment') $$, 'the office can add a client document');
select lives_ok($$ insert into public.care_documents (worker_id, drive_file_id, name, mime_type, size_bytes, category)
  values ('00000000-0000-0000-0000-0000000000d2', 'f-cert', 'Certificate.pdf', 'application/pdf', 1000, 'certificate') $$, 'the office can add a care worker document');
select throws_ok($$ insert into public.care_documents (client_id, worker_id, drive_file_id, name, mime_type, size_bytes, category)
  values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-0000-0000-0000000000d2', 'f-both', 'x.pdf', 'application/pdf', 1, 'other') $$, '23514', null, 'a document belongs to one client or one care worker');
select throws_ok($$ select * from public.drive_connection_get() $$, '42501', null, 'staff cannot read the Drive sign-in');
select results_eq($$ select connected from public.drive_status() $$, array[false], 'staff can see whether Drive is connected');

-- Care worker sends a file for their client, sees only what they sent
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$ insert into public.care_documents (client_id, drive_file_id, name, mime_type, size_bytes, category)
  values ('00000000-0000-4000-8000-00000000d0c1', 'f-report', 'Visit report.docx', 'application/msword', 2000, 'report') $$, 'a care worker can send a report file for their client');
select throws_ok($$ insert into public.care_documents (client_id, drive_file_id, name, mime_type, size_bytes, category)
  values ('00000000-0000-4000-8000-00000000d0c2', 'f-other', 'x.pdf', 'application/pdf', 1, 'report') $$, '42501', null, 'not for a client they do not look after');
select throws_ok($$ insert into public.care_documents (client_id, drive_file_id, name, mime_type, size_bytes, category)
  values ('00000000-0000-4000-8000-00000000d0c1', 'f-med', 'x.pdf', 'application/pdf', 1, 'medical') $$, '42501', null, 'care workers can only send report files');
select results_eq($$ select name from public.care_documents $$, array['Visit report.docx'], 'a care worker sees only the files they sent');
select is_empty($$ delete from public.care_documents returning id $$, 'a care worker cannot delete files');

-- Content editor and family see nothing
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d3", "role": "authenticated", "aal": "aal2"}';
select is_empty($$ select id from public.care_documents $$, 'content editors cannot see documents');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d4", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select id from public.care_documents $$, 'families cannot see documents');

-- Office sees all three
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.care_documents), 3, 'the office sees client and care worker documents');

select * from finish();
rollback;
