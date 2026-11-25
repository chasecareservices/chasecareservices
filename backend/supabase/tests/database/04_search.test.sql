-- Site search: published content only, partial words, ranking, odd input.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.services (slug, service_group, name, summary, status)
values ('test-draft-service', 'care', 'Zebracare Secret Draft', 'Not yet live', 'draft');
insert into public.posts (slug, title, excerpt, status, published_at, body) values
  ('test-zebra-live', 'Zebracare guide for families', 'Live article', 'published', now() - interval '1 day',
   '[{"type": "paragraph", "data": {"text": "Practical quokka tips for carers."}}]'),
  ('test-zebra-scheduled', 'Zebracare scheduled post', 'Not yet', 'published', now() + interval '7 days', '[]');

set local role anon;

select is(
  (select url from public.search_site('elderly') limit 1),
  '/care-services/elderly-care',
  'finds a published service by a word in its name');

select ok(
  exists (select 1 from public.search_site('eld') where url = '/care-services/elderly-care'),
  'matches the start of a word (eld → Elderly)');

select ok(
  exists (select 1 from public.search_site('welfare') where url = '/diaspora/welfare-visits'),
  'builds the right address for diaspora services');

select is(
  (select array_agg(url order by url) from public.search_site('zebracare')),
  array['/journal/test-zebra-live'],
  'only published content is found (no drafts, no scheduled posts)');

select ok(
  exists (select 1 from public.search_site('quokka') where kind = 'article'),
  'searches inside article body text');

select ok(
  (select rank from public.search_site('autism') where url = '/care-services/autism-support')
  > coalesce((select max(rank) from public.search_site('autism') where url <> '/care-services/autism-support'), 0),
  'a title match ranks above mentions elsewhere');

select is((select count(*)::int from public.search_site('')), 0, 'empty search returns nothing');
select lives_ok($$ select * from public.search_site($q$'); drop table x; -- & | ! :* ()$q$) $$, 'symbols in the search box cannot break the query');
select ok((select count(*) from public.search_site('care', 500)) <= 50, 'results are capped at 50');

select * from finish();
rollback;
