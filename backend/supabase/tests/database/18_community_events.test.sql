-- Community events and the Monthly Forum.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select is(private.third_thursday('2026-12-01'), '2026-12-17'::date, 'third Thursday of December 2026');
select is(private.third_thursday('2027-01-01'), '2027-01-21'::date, 'third Thursday of January 2027');
select public.ensure_forums();
select public.ensure_forums();
select ok((select count(*) from public.community_events where kind = 'forum' and starts_at > now()) between 3 and 4, 'the next forums exist, once each');
select is((select extract(dow from starts_at at time zone 'UTC')::int from public.community_events where kind = 'forum' order by starts_at limit 1), 4, 'forums are on a Thursday');

insert into public.community_events (id, slug, title, starts_at, capacity, status) values
  ('00000000-0000-4000-8000-0000000000c1', 'test-walk', 'Awareness walk', now() + interval '5 days', 1, 'published'),
  ('00000000-0000-4000-8000-0000000000c2', 'test-draft', 'Draft event', now() + interval '5 days', null, 'draft'),
  ('00000000-0000-4000-8000-0000000000c3', 'test-past', 'Past event', now() - interval '5 days', null, 'published');
insert into public.community_event_links (event_id, online_url) values ('00000000-0000-4000-8000-0000000000c1', 'https://meet.example.com/secret');

set local role anon;
select is_empty($$ select id from public.community_events where slug = 'test-draft' $$, 'visitors cannot see draft events');
select throws_ok($$ select online_url from public.community_event_links $$, '42501', null, 'nor the online joining links');
select isnt(public.register_for_event('00000000-0000-4000-8000-0000000000c1', 'Akos Visitor', true, 'akos@example.com'), null, 'a visitor can register');
select is(public.event_places_left('00000000-0000-4000-8000-0000000000c1'), 0, 'places left goes down');
select throws_ok($$ select public.register_for_event('00000000-0000-4000-8000-0000000000c1', 'Second Person', true, 'two@example.com') $$, '53400', null, 'a full event refuses more people');
select throws_ok($$ select public.register_for_event('00000000-0000-4000-8000-0000000000c2', 'Akos', true, 'a@example.com') $$, 'P0002', null, 'drafts cannot be registered for');
select throws_ok($$ select public.register_for_event('00000000-0000-4000-8000-0000000000c3', 'Akos', true, 'a@example.com') $$, '55000', null, 'past events are closed');
select throws_ok($$ select public.register_for_event('00000000-0000-4000-8000-0000000000c1', 'Akos', false, 'a@example.com') $$, '22023', null, 'consent is required');
select throws_ok($$ select id from public.event_registrations $$, '42501', null, 'visitors cannot list registrations');

reset role;
select is(public.cancel_event_registration((select token from public.event_registrations where email = 'akos@example.com')), 'Awareness walk', 'the cancel link works');
select is(public.event_places_left('00000000-0000-4000-8000-0000000000c1'), 1, 'and frees the place');

select * from finish();
rollback;
