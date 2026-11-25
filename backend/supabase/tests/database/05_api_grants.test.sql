-- The website's API roles have exactly the table access they need
-- (cloud projects do not grant new tables automatically).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Visitors can read every public content table…
select ok(
  (select bool_and(has_table_privilege('anon', t, 'select')) from unnest(array[
    'public.site_settings', 'public.pages', 'public.navigation_items', 'public.services', 'public.team_members',
    'public.partners', 'public.testimonials', 'public.announcements', 'public.media_assets', 'public.post_categories',
    'public.posts', 'public.courses', 'public.product_categories', 'public.products'
  ]) as t),
  'visitors can read all public content tables');

-- …but nothing private, and they cannot write anywhere.
select ok(not has_table_privilege('anon', 'public.enquiries', 'select'), 'visitors cannot read the enquiries table');
select ok(not has_table_privilege('anon', 'public.audit_log', 'select'), 'visitors cannot read the audit log');
select ok(not has_table_privilege('anon', 'public.user_roles', 'select'), 'visitors cannot read user roles');
select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ),
  'visitors have no write access to any table');

-- Signed-in users reach tables (RLS still filters rows), except writing the audit log.
select ok(has_table_privilege('authenticated', 'public.pages', 'update'), 'signed-in users can reach tables (RLS decides rows)');
select ok(not has_table_privilege('authenticated', 'public.audit_log', 'insert'), 'nobody can write the audit log through the API');

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated') and table_schema = 'public' and privilege_type = 'TRUNCATE'
  ),
  'no API role can TRUNCATE (empty) a table');

-- Every table in public is covered for signed-in users (catches new tables without grants).
select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not has_table_privilege('authenticated', c.oid, 'select')),
  null,
  'every public table is granted to signed-in users');

select * from finish();
rollback;
