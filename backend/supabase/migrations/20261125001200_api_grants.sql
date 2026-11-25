-- =============================================================================
-- Table permissions for the website's Data API roles.
--
-- Supabase cloud projects do not automatically grant new tables to the `anon`
-- (visitors) and `authenticated` (signed-in users) roles. Without these grants
-- every request fails with "permission denied", whatever the RLS policies say.
--
-- GRANTs decide whether a role may touch a table at all; Row Level Security
-- (set up in earlier migrations) still decides which rows it may see or change.
-- Visitors only get read access to public content tables.
--
-- New tables in later migrations must add their own GRANTs.
-- =============================================================================

-- Start from a clean slate for visitors: remove any default write access, including
-- TRUNCATE, which would empty a table and is not subject to Row Level Security.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke select on all tables in schema public from anon;

-- Visitors (publishable key, not signed in): read public content only.
grant select on
  public.site_settings,
  public.pages,
  public.navigation_items,
  public.services,
  public.team_members,
  public.partners,
  public.testimonials,
  public.announcements,
  public.media_assets,
  public.post_categories,
  public.posts,
  public.courses,
  public.product_categories,
  public.products
to anon;

-- Signed-in users: RLS limits them to their own rows or what their role permits.
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke truncate, references, trigger on all tables in schema public from authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Audit log is written only by triggers; nobody may change it through the API.
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- Server-side code using the secret key.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
