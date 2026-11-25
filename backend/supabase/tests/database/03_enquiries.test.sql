-- Public forms: submit_enquiry() validation, honeypot, rate limit, inbox privacy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'ops@test.local');
insert into public.user_roles (user_id, role_key) values ('00000000-0000-0000-0000-0000000000c1', 'operations_manager');
update private.security_settings set require_staff_mfa = true;

set local role anon;

select isnt(
  public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true,
                        email => 'Kofi@Example.com', message => 'Hello'),
  null, 'a visitor can submit the contact form');

select throws_ok(
  $$ select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => false, email => 'k@example.com') $$,
  'Consent is required', 'consent is required');
select throws_ok(
  $$ select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true) $$,
  'An email address or phone number is required', 'an email or phone number is required');
select throws_ok(
  $$ select public.submit_enquiry(enquiry_type => 'contact', full_name => '  ', consent_given => true, email => 'k@example.com') $$,
  'Name is required', 'a name is required');
select throws_ok(
  $$ select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true, email => 'not-an-email') $$,
  '23514', null, 'an invalid email address is rejected');

select throws_ok(
  $$ insert into public.enquiries (enquiry_type, full_name, email, consent_given) values ('contact', 'Direct', 'd@example.com', true) $$,
  '42501', null, 'visitors cannot insert into the inbox directly');
select is((select count(*)::int from public.enquiries), 0, 'visitors cannot read the inbox');

-- Honeypot: pretend success, store nothing.
reset role;
select is(
  (select count(*)::int from public.enquiries where full_name = 'Bot'),
  0, 'precondition: no bot rows');
set local role anon;
select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Bot', consent_given => true,
                             email => 'bot@example.com', website => 'http://spam.example');

-- Rate limit: 5 per email per hour (1 already submitted above).
select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true, email => 'kofi@example.com');
select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true, email => 'kofi@example.com');
select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true, email => 'kofi@example.com');
select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true, email => 'kofi@example.com');
select throws_ok(
  $$ select public.submit_enquiry(enquiry_type => 'contact', full_name => 'Kofi', consent_given => true, email => 'KOFI@example.com') $$,
  'Too many submissions. Please try again later.', 'repeat submissions from one email are limited');

-- Operations manager sees the inbox (bot submission was not stored).
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated", "aal": "aal2"}';
select is(
  (select count(*)::int from public.enquiries where lower(email) in ('kofi@example.com', 'bot@example.com')),
  5, 'staff with enquiries.view see real submissions only');

select * from finish();
rollback;
