-- Client intake: address fields, digital address format, one client per request.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.enquiries (enquiry_type, full_name, email, consent_given) values ('care_request', 'Requester', 'r@example.com', true);
select lives_ok($$ insert into public.care_clients (full_name, address, digital_address, source_enquiry_id)
  select 'Client One', 'Near the Shell filling station, Spintex', 'GA-183-8164', id from public.enquiries where full_name = 'Requester' $$, 'a client can be created from a care request');
select throws_ok($$ insert into public.care_clients (full_name, source_enquiry_id) select 'Client Two', id from public.enquiries where full_name = 'Requester' $$,
  '23505', null, 'the same care request cannot create two clients');
select throws_ok($$ insert into public.care_clients (full_name, digital_address) values ('Client Three', 'ga1838164') $$, '23514', null, 'digital addresses must look like GA-183-8164');
select lives_ok($$ delete from public.enquiries where full_name = 'Requester' $$, 'deleting the request keeps the client');

select * from finish();
rollback;
