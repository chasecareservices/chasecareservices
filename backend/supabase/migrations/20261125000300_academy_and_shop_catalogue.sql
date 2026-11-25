-- =============================================================================
-- ChaseCare Academy catalogue and Shop catalogue — Phase 1 (display only).
-- Enrolments, sessions, orders and payments arrive in Phases 2–3.
-- Spec: doc/BACKEND_SPECIFICATION.md §4.6, §4.7; doc/ADMIN_DASHBOARD_SPECIFICATION.md §3.8, §3.11
-- =============================================================================

-- Distinguish clearly between internal, CPD and externally accredited courses [§14].
create type public.certification_type as enum ('internal', 'cpd', 'externally_accredited');
create type public.course_audience as enum ('caregivers', 'professionals', 'parents', 'students', 'general');
create type public.delivery_mode as enum ('in_person', 'online', 'blended');

create table public.courses (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                   text not null,
  category                text,
  audience                public.course_audience not null default 'caregivers',
  summary                 text,
  description             jsonb not null default '[]'::jsonb check (jsonb_typeof(description) = 'array'),
  learning_outcomes       text[] not null default '{}',
  duration_text           text,                          -- e.g. "2 days", "6 weeks (online)"
  delivery_mode           public.delivery_mode not null default 'in_person',
  fee_amount              numeric(12, 2) check (fee_amount is null or fee_amount >= 0),
  fee_currency            text not null default 'GHS' check (fee_currency ~ '^[A-Z]{3}$'),
  certification_type      public.certification_type not null default 'internal',
  accrediting_body        text,
  accreditation_reference text,
  is_signature            boolean not null default false,  -- e.g. Care Beyond Care
  image_path              text,
  seo_title               text,
  seo_description         text,
  status                  public.content_status not null default 'draft',
  sort_order              integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- A course may only be labelled externally accredited when the accreditation is recorded.
  constraint courses_accreditation_recorded check (
    certification_type <> 'externally_accredited'
    or (nullif(trim(accrediting_body), '') is not null and nullif(trim(accreditation_reference), '') is not null)
  )
);
create index courses_status_order_idx on public.courses (status, sort_order);

create table public.product_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  sort_order integer not null default 0
);

create table public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text not null,
  description    text,
  category_id    uuid references public.product_categories (id) on delete set null,
  price_amount   numeric(12, 2) check (price_amount is null or price_amount >= 0),
  price_currency text not null default 'GHS' check (price_currency ~ '^[A-Z]{3}$'),
  image_paths    text[] not null default '{}',
  variants       jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'), -- e.g. T-shirt sizes
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),          -- null = not tracked
  is_available   boolean not null default true,
  status         public.content_status not null default 'draft',
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index products_status_order_idx on public.products (status, sort_order);

create trigger courses_set_updated_at  before update on public.courses  for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function private.set_updated_at();

select private.enable_audit('public.courses');
select private.enable_audit('public.product_categories');
select private.enable_audit('public.products');

alter table public.courses            enable row level security;
alter table public.product_categories enable row level security;
alter table public.products           enable row level security;

-- Courses: published public; academy.* for staff.
create policy "courses: public read published" on public.courses
  for select to anon, authenticated using (status = 'published');
create policy "courses: staff read" on public.courses
  for select to authenticated using (public.has_permission('academy.view'));
create policy "courses: staff create" on public.courses
  for insert to authenticated with check (public.has_permission('academy.create'));
create policy "courses: staff edit" on public.courses
  for update to authenticated
  using (public.has_permission('academy.edit'))
  with check (public.has_permission('academy.edit'));
create policy "courses: staff delete" on public.courses
  for delete to authenticated using (public.has_permission('academy.delete'));

-- Shop: published public; shop.* for staff.
create policy "product_categories: public read" on public.product_categories
  for select to anon, authenticated using (true);
create policy "product_categories: staff write" on public.product_categories
  for all to authenticated
  using (public.has_permission('shop.edit'))
  with check (public.has_permission('shop.edit'));

create policy "products: public read published" on public.products
  for select to anon, authenticated using (status = 'published');
create policy "products: staff read" on public.products
  for select to authenticated using (public.has_permission('shop.view'));
create policy "products: staff create" on public.products
  for insert to authenticated with check (public.has_permission('shop.create'));
create policy "products: staff edit" on public.products
  for update to authenticated
  using (public.has_permission('shop.edit'))
  with check (public.has_permission('shop.edit'));
create policy "products: staff delete" on public.products
  for delete to authenticated using (public.has_permission('shop.delete'));
