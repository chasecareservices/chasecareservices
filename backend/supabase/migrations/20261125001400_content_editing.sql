-- =============================================================================
-- Content editing in the staff dashboard (stage 2).
-- =============================================================================

-- Background photos for the banner at the top of each main page, chosen in the
-- dashboard: { "care-services": "banners/2026/abc.jpg", … } (paths in public-media).
alter table public.site_settings
  add column if not exists page_banners jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_settings_page_banners_object') then
    alter table public.site_settings
      add constraint site_settings_page_banners_object check (jsonb_typeof(page_banners) = 'object');
  end if;
end;
$$;

comment on column public.site_settings.page_banners is
  'Banner photo per page key (paths in the public-media bucket). Pages without an entry use the built-in default.';

-- Training and shop staff add photos to courses and products, so they may upload media.
insert into public.role_permissions (role_key, permission_key) values
  ('training_coordinator', 'media.create'),
  ('bookings_finance', 'media.create')
on conflict do nothing;

-- Content editors choose page banners, but may not change the rest of the site settings.
-- This function updates only page_banners, and only for staff with content.edit.
create or replace function public.set_page_banners(banners jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('content.edit') then
    raise exception 'You do not have permission to change page banners' using errcode = '42501';
  end if;
  if banners is null or jsonb_typeof(banners) <> 'object' then
    raise exception 'Banners must be an object of page key to image path' using errcode = '22023';
  end if;
  update public.site_settings set page_banners = banners, updated_by = (select auth.uid()) where id = true;
end;
$$;
revoke all on function public.set_page_banners(jsonb) from public, anon;
grant execute on function public.set_page_banners(jsonb) to authenticated;
