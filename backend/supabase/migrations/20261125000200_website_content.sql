-- =============================================================================
-- Website content (CMS) — Phase 1.
-- Spec: doc/ADMIN_DASHBOARD_SPECIFICATION.md §3.2, §3.3, §3.17; doc/FRONTEND_SPECIFICATION.md §3
-- Public visitors can read published content only. Staff edit through has_permission().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Site settings (single row)
-- -----------------------------------------------------------------------------
create table public.site_settings (
  id                   boolean primary key default true check (id),
  organisation_name    text not null default 'Chase Care Services',
  tagline              text not null default 'Quality Care. Compassionate Support. Empowered Lives.',
  supporting_statement text,
  phone                text,
  whatsapp_number      text,
  email                text,
  address              text,
  map_url              text,
  opening_hours        jsonb not null default '[]'::jsonb,  -- [{ "days": "Mon–Fri", "hours": "08:00–17:00" }]
  social_links         jsonb not null default '{}'::jsonb,  -- { "facebook": "https://…", … }
  default_seo          jsonb not null default '{}'::jsonb,  -- { "title": "…", "description": "…", "image_path": "…" }
  cookie_banner_text   text,
  currency             text not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  timezone             text not null default 'Africa/Accra',
  updated_at           timestamptz not null default now(),
  updated_by           uuid references public.profiles (id) on delete set null
);
insert into public.site_settings default values;

-- Which staff email addresses receive which notifications (staff only — not public).
create table public.notification_recipients (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,   -- e.g. 'enquiry.contact', 'enquiry.care_request'
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  unique (topic, email)
);

-- -----------------------------------------------------------------------------
-- Pages (About, Diaspora, Respite, Wellbeing, Legal, Homepage …)
-- Body is a list of content blocks so editors can add/reorder/hide sections:
--   [{ "type": "hero", "visible": true, "data": { … } }, { "type": "cards", … }]
-- -----------------------------------------------------------------------------
create table public.pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'),
  title            text not null check (char_length(title) between 1 and 200),
  summary          text,
  body             jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  seo_title        text,
  seo_description  text,
  og_image_path    text,
  status           public.content_status not null default 'draft',
  published_at     timestamptz,
  show_in_sitemap  boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null
);

-- Version history so editors can restore an earlier version.
create table public.page_revisions (
  id         bigint generated always as identity primary key,
  page_id    uuid not null references public.pages (id) on delete cascade,
  snapshot   jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);
create index page_revisions_page_idx on public.page_revisions (page_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Navigation (main menu, footer)
-- -----------------------------------------------------------------------------
create table public.navigation_items (
  id         uuid primary key default gen_random_uuid(),
  menu       text not null check (menu in ('main', 'footer', 'cta')),
  label      text not null,
  href       text not null,
  parent_id  uuid references public.navigation_items (id) on delete cascade,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index navigation_items_menu_idx on public.navigation_items (menu, parent_id, sort_order);

-- -----------------------------------------------------------------------------
-- Services (care services, diaspora services, respite options)
-- -----------------------------------------------------------------------------
create type public.service_group as enum ('care', 'diaspora', 'respite', 'partnership');

create table public.services (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  service_group   public.service_group not null default 'care',
  name            text not null,
  summary         text,
  description     text,
  includes        text[] not null default '{}',  -- "What's included" bullet list
  audience        text,
  image_path      text,
  cta_label       text default 'Request this service',
  seo_title       text,
  seo_description text,
  status          public.content_status not null default 'draft',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null
);
create index services_group_order_idx on public.services (service_group, sort_order);

-- -----------------------------------------------------------------------------
-- Leadership & team (About → Board of Directors / Our Team)
-- -----------------------------------------------------------------------------
create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('board', 'team')),
  full_name   text not null,
  position    text,
  background  text,
  experience  text,
  bio         text,
  photo_path  text,
  sort_order  integer not null default 0,
  status      public.content_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Partners — shown publicly only once permission to display is recorded.
-- -----------------------------------------------------------------------------
create type public.partner_type as enum (
  'healthcare', 'laboratory', 'insurance', 'school', 'hospital',
  'community', 'therapist', 'training_accreditation', 'corporate'
);

create table public.partners (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  partner_type            public.partner_type not null,
  description             text,
  logo_path               text,
  website_url             text,
  display_permission      boolean not null default false,
  display_permission_note text,   -- who gave permission and when
  status                  public.content_status not null default 'draft',
  sort_order              integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint partners_publish_needs_permission
    check (status <> 'published' or display_permission)
);

-- -----------------------------------------------------------------------------
-- Testimonials — publishing requires recorded consent.
-- -----------------------------------------------------------------------------
create table public.testimonials (
  id                  uuid primary key default gen_random_uuid(),
  author_name         text not null,
  author_context      text,          -- e.g. "Daughter of a client, London"
  quote               text not null,
  consent_obtained    boolean not null default false,
  consent_recorded_at timestamptz,
  consent_notes       text,
  status              public.content_status not null default 'draft',
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint testimonials_publish_needs_consent
    check (status <> 'published' or (consent_obtained and consent_recorded_at is not null))
);

-- -----------------------------------------------------------------------------
-- Announcements / site banners
-- -----------------------------------------------------------------------------
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null default 'public' check (audience in ('public', 'workers', 'clients', 'staff')),
  message    text not null,
  link_url   text,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

-- -----------------------------------------------------------------------------
-- Media library (metadata for files in the public-media storage bucket)
-- -----------------------------------------------------------------------------
create table public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text not null default 'public-media',
  object_path text not null,
  folder      text,
  alt_text    text,
  mime_type   text,
  size_bytes  bigint,
  width       integer,
  height      integer,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (bucket_id, object_path)
);

-- -----------------------------------------------------------------------------
-- The ChaseCare Journal (blog)
-- -----------------------------------------------------------------------------
create table public.post_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  sort_order integer not null default 0
);

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title            text not null check (char_length(title) between 1 and 200),
  excerpt          text,
  body             jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  cover_image_path text,
  category_id      uuid references public.post_categories (id) on delete set null,
  tags             text[] not null default '{}',
  author_id        uuid references public.profiles (id) on delete set null,
  author_name      text,  -- display name, so posts survive staff leaving
  seo_title        text,
  seo_description  text,
  status           public.content_status not null default 'draft',
  published_at     timestamptz,  -- a future date schedules publication
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint posts_published_needs_date check (status <> 'published' or published_at is not null)
);
create index posts_published_idx on public.posts (status, published_at desc);
create index posts_category_idx on public.posts (category_id);

-- -----------------------------------------------------------------------------
-- Triggers: updated_at, publish date, page revisions, audit
-- -----------------------------------------------------------------------------
create trigger site_settings_set_updated_at    before update on public.site_settings    for each row execute function private.set_updated_at();
create trigger pages_set_updated_at            before update on public.pages            for each row execute function private.set_updated_at();
create trigger navigation_items_set_updated_at before update on public.navigation_items for each row execute function private.set_updated_at();
create trigger services_set_updated_at         before update on public.services         for each row execute function private.set_updated_at();
create trigger team_members_set_updated_at     before update on public.team_members     for each row execute function private.set_updated_at();
create trigger partners_set_updated_at         before update on public.partners         for each row execute function private.set_updated_at();
create trigger testimonials_set_updated_at     before update on public.testimonials     for each row execute function private.set_updated_at();
create trigger announcements_set_updated_at    before update on public.announcements    for each row execute function private.set_updated_at();
create trigger posts_set_updated_at            before update on public.posts            for each row execute function private.set_updated_at();

-- Fill published_at the first time something is published; record the editor.
create function private.stamp_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if tg_table_name = 'pages' then
    new.updated_by := coalesce((select auth.uid()), new.updated_by);
    if tg_op = 'INSERT' then
      new.created_by := coalesce(new.created_by, (select auth.uid()));
    end if;
  end if;
  return new;
end;
$$;
create trigger pages_stamp_publication before insert or update on public.pages for each row execute function private.stamp_publication();
create trigger posts_stamp_publication before insert or update on public.posts for each row execute function private.stamp_publication();

-- Snapshot the previous version of a page before every change.
create function private.snapshot_page()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.page_revisions (page_id, snapshot, created_by)
  values (old.id, to_jsonb(old), (select auth.uid()));
  return new;
end;
$$;
create trigger pages_snapshot
  before update on public.pages
  for each row
  when (old.* is distinct from new.*)
  execute function private.snapshot_page();

select private.enable_audit('public.site_settings');
select private.enable_audit('public.notification_recipients');
select private.enable_audit('public.pages');
select private.enable_audit('public.navigation_items');
select private.enable_audit('public.services');
select private.enable_audit('public.team_members');
select private.enable_audit('public.partners');
select private.enable_audit('public.testimonials');
select private.enable_audit('public.announcements');
select private.enable_audit('public.media_assets');
select private.enable_audit('public.post_categories');
select private.enable_audit('public.posts');

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.site_settings           enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.pages                   enable row level security;
alter table public.page_revisions          enable row level security;
alter table public.navigation_items        enable row level security;
alter table public.services                enable row level security;
alter table public.team_members            enable row level security;
alter table public.partners                enable row level security;
alter table public.testimonials            enable row level security;
alter table public.announcements           enable row level security;
alter table public.media_assets            enable row level security;
alter table public.post_categories         enable row level security;
alter table public.posts                   enable row level security;

-- Site settings: public read, settings.edit to change. No insert/delete (single row).
create policy "site_settings: public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: edit" on public.site_settings
  for update to authenticated
  using (public.has_permission('settings.edit'))
  with check (public.has_permission('settings.edit'));

create policy "notification_recipients: staff" on public.notification_recipients
  for all to authenticated
  using (public.has_permission('settings.edit'))
  with check (public.has_permission('settings.edit'));
create policy "notification_recipients: view" on public.notification_recipients
  for select to authenticated using (public.has_permission('settings.view'));

-- Generic content policies: published rows public; content.* for staff.
do $$
declare
  t text;
begin
  foreach t in array array['pages', 'services', 'team_members', 'partners', 'testimonials'] loop
    execute format($f$
      create policy "%1$s: public read published" on public.%1$I
        for select to anon, authenticated
        using (status = 'published');
      create policy "%1$s: staff read" on public.%1$I
        for select to authenticated using (public.has_permission('content.view'));
      create policy "%1$s: staff create" on public.%1$I
        for insert to authenticated with check (public.has_permission('content.create'));
      create policy "%1$s: staff edit" on public.%1$I
        for update to authenticated
        using (public.has_permission('content.edit'))
        with check (public.has_permission('content.edit'));
      create policy "%1$s: staff delete" on public.%1$I
        for delete to authenticated using (public.has_permission('content.delete'));
    $f$, t);
  end loop;
end;
$$;

create policy "page_revisions: staff read" on public.page_revisions
  for select to authenticated using (public.has_permission('content.view'));

-- Navigation: visible items public; content.* for staff.
create policy "navigation_items: public read" on public.navigation_items
  for select to anon, authenticated using (is_visible);
create policy "navigation_items: staff read" on public.navigation_items
  for select to authenticated using (public.has_permission('content.view'));
create policy "navigation_items: staff write" on public.navigation_items
  for all to authenticated
  using (public.has_permission('content.edit'))
  with check (public.has_permission('content.edit'));

-- Announcements: currently-running public ones are public; others by audience later.
create policy "announcements: public read current" on public.announcements
  for select to anon, authenticated
  using (audience = 'public' and is_active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy "announcements: staff read" on public.announcements
  for select to authenticated using (public.has_permission('communications.view') or public.has_permission('content.view'));
create policy "announcements: staff write" on public.announcements
  for all to authenticated
  using (public.has_permission('communications.edit'))
  with check (public.has_permission('communications.edit'));

-- Media library: metadata is public (files are in a public bucket); media.* to manage.
create policy "media_assets: public read" on public.media_assets
  for select to anon, authenticated using (bucket_id = 'public-media');
create policy "media_assets: staff create" on public.media_assets
  for insert to authenticated with check (public.has_permission('media.create'));
create policy "media_assets: staff edit" on public.media_assets
  for update to authenticated
  using (public.has_permission('media.edit'))
  with check (public.has_permission('media.edit'));
create policy "media_assets: staff delete" on public.media_assets
  for delete to authenticated using (public.has_permission('media.delete'));

-- Blog.
create policy "post_categories: public read" on public.post_categories
  for select to anon, authenticated using (true);
create policy "post_categories: staff write" on public.post_categories
  for all to authenticated
  using (public.has_permission('blog.edit'))
  with check (public.has_permission('blog.edit'));

create policy "posts: public read published" on public.posts
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "posts: staff read" on public.posts
  for select to authenticated using (public.has_permission('blog.view'));
create policy "posts: staff create" on public.posts
  for insert to authenticated with check (public.has_permission('blog.create'));
create policy "posts: staff edit" on public.posts
  for update to authenticated
  using (public.has_permission('blog.edit'))
  with check (public.has_permission('blog.edit'));
create policy "posts: staff delete" on public.posts
  for delete to authenticated using (public.has_permission('blog.delete'));
