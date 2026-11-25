-- Roles, permissions, two-factor rule, super-admin safety, audit log.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Test users (profiles are created by the auth trigger).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'nobody@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'useradmin@test.local');

select is(
  (select count(*)::int from public.profiles where id in (
    '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4')),
  4, 'a profile is created for every new auth user');

-- Custom role holding users.* (but not super_admin) to test escalation rules.
insert into public.roles (key, name) values ('user_admin', 'User Admin');
insert into public.role_permissions (role_key, permission_key) values ('user_admin', 'users.view'), ('user_admin', 'users.edit');

insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000a1', 'super_admin'),
  ('00000000-0000-0000-0000-0000000000a2', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000a4', 'user_admin');

-- Start with the production default: staff must use two-factor sign-in.
update private.security_settings set require_staff_mfa = true;

set local role authenticated;

-- Editor, signed in WITHOUT two-factor.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated", "aal": "aal1"}';
select ok(not public.has_permission('content.edit'), 'staff permissions need two-factor (aal1 denied)');
select ok(not public.is_staff(), 'is_staff() is false without two-factor');

-- Editor WITH two-factor.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated", "aal": "aal2"}';
select ok(public.has_permission('content.edit'), 'content editor can edit content (aal2)');
select ok(not public.has_permission('settings.edit'), 'content editor cannot edit site settings');
select ok(not public.has_permission('enquiries.view'), 'content editor cannot read enquiries');
select ok(public.is_staff(), 'content editor counts as staff');

-- Owner (super admin) has every permission.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "aal": "aal2"}';
select ok(public.has_permission('settings.edit') and public.has_permission('audit.view') and public.has_permission('payments.export'),
  'super admin holds every permission');

-- A user with no role has nothing.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a3", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.my_permissions()), 0, 'user without a role has no permissions');
select throws_ok(
  $$ update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a3' $$,
  'Only staff with users.edit can change account status',
  'users cannot change their own account status');

-- User admin may grant ordinary roles but not super_admin.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a4", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$ insert into public.user_roles (user_id, role_key) values ('00000000-0000-0000-0000-0000000000a3', 'content_editor') $$,
  'a users.edit holder can grant a normal role');
select throws_ok(
  $$ insert into public.user_roles (user_id, role_key) values ('00000000-0000-0000-0000-0000000000a3', 'super_admin') $$,
  '42501', null,
  'only a super admin can grant super_admin');

-- The last super admin cannot be removed.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated", "aal": "aal2"}';
reset role;
delete from public.user_roles where role_key = 'super_admin' and user_id <> '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select throws_ok(
  $$ delete from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000a1' and role_key = 'super_admin' $$,
  'Cannot remove the last active super admin',
  'the last active super admin cannot be removed');

-- Deactivated staff lose their permissions.
reset role;
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a2';
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated", "aal": "aal2"}';
select ok(not public.has_permission('content.edit'), 'deactivated staff lose all permissions');

-- Audit log records the actor and is hidden from non-auditors.
select is((select count(*)::int from public.audit_log), 0, 'audit log is hidden from users without audit.view');
reset role;
select ok(
  exists (select 1 from public.audit_log
          where table_name = 'user_roles' and action = 'INSERT'
            and actor_id = '00000000-0000-0000-0000-0000000000a4'
            and record_id = '00000000-0000-0000-0000-0000000000a3'),
  'role changes are written to the audit log with the actor');

select * from finish();
rollback;
