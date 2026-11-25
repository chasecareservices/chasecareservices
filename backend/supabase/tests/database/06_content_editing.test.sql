-- Content editing rules for the staff dashboard.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'ops@test.local');
insert into public.user_roles (user_id, role_key) values
  ('00000000-0000-0000-0000-0000000000d1', 'content_editor'),
  ('00000000-0000-0000-0000-0000000000d2', 'operations_manager');
update private.security_settings set require_staff_mfa = true;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d1", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$ select public.set_page_banners('{"about": "banners/2026/x.jpg"}') $$, 'content editors can set page banners');
select is_empty($$ update public.site_settings set phone = '123' where id returning id $$, 'content editors still cannot change other site settings');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000d2", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$ select public.set_page_banners('{}') $$, '42501', null, 'staff without content.edit cannot set banners');

reset role;
select is((select page_banners ->> 'about' from public.site_settings), 'banners/2026/x.jpg', 'the banner was saved');

select * from finish();
rollback;
