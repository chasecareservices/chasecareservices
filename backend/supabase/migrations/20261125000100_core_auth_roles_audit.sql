-- =============================================================================
-- Core: shared helpers, user profiles, roles & permissions, audit log.
-- Spec: doc/BACKEND_SPECIFICATION.md §2, §5; doc/ADMIN_DASHBOARD_SPECIFICATION.md §2, §3.16
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Shared enums & helpers
-- -----------------------------------------------------------------------------
create type public.content_status as enum ('draft', 'published', 'archived');

-- Keeps updated_at current on every UPDATE.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (one per auth user)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (char_length(full_name) <= 200),
  phone       text check (char_length(phone) <= 40),
  avatar_path text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth user. is_active=false blocks all role permissions.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create a profile automatically when an auth user is created (sign-up or invite).
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Roles & permissions (supports the owner creating custom roles)
-- -----------------------------------------------------------------------------
create table public.roles (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]{1,49}$'),
  name        text not null,
  description text,
  is_staff    boolean not null default true,  -- staff roles can reach the admin dashboard
  is_system   boolean not null default false, -- system roles cannot be deleted or renamed
  created_at  timestamptz not null default now()
);

create table public.permissions (
  key         text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'), -- "<section>.<action>"
  section     text not null,
  action      text not null,
  description text
);

create table public.role_permissions (
  role_key       text not null references public.roles (key) on update cascade on delete cascade,
  permission_key text not null references public.permissions (key) on update cascade on delete cascade,
  primary key (role_key, permission_key)
);

create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role_key   text not null references public.roles (key) on update cascade on delete restrict,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_key)
);
create index user_roles_role_key_idx on public.user_roles (role_key);

-- Permission catalogue: every admin-dashboard section x the actions it needs.
insert into public.permissions (key, section, action, description)
select s.section || '.' || a.action, s.section, a.action, s.label || ': ' || a.action
from (values
  ('content',        'Website content (pages, services, navigation, leadership, partners, testimonials)'),
  ('blog',           'The ChaseCare Journal'),
  ('media',          'Media library'),
  ('enquiries',      'Enquiries & form submissions'),
  ('clients',        'Clients & families'),
  ('workforce',      'Workforce & recruitment'),
  ('care_ops',       'Care operations'),
  ('academy',        'ChaseCare Academy'),
  ('bookings',       'Bookings, respite & accommodation'),
  ('payments',       'Payments & finance'),
  ('shop',           'Shop'),
  ('wellbeing',      'Wellbeing Hub (confidential)'),
  ('community',      'Community & events'),
  ('communications', 'Templates & announcements'),
  ('reports',        'Reports & analytics'),
  ('users',          'Users, roles & security'),
  ('settings',       'Site settings'),
  ('audit',          'Audit log')
) as s(section, label)
cross join (values ('view'), ('create'), ('edit'), ('delete'), ('export')) as a(action);

-- System roles (doc/ADMIN_DASHBOARD_SPECIFICATION.md §2).
insert into public.roles (key, name, description, is_staff, is_system) values
  ('super_admin',          'Super Admin (Owner)',         'Full access to everything.',                                   true,  true),
  ('operations_manager',   'Operations / Care Manager',   'Clients, care requests, workers, matching, reports, incidents.', true, true),
  ('recruitment_officer',  'Recruitment Officer',         'Applicants, screening, references, documents, competency.',   true,  true),
  ('training_coordinator', 'Training Coordinator',        'Academy courses, sessions, enrolments, certificates.',         true,  true),
  ('wellbeing_officer',    'Wellbeing Officer',           'Confidential wellbeing requests and resources.',               true,  true),
  ('bookings_finance',     'Bookings & Finance',          'Bookings, respite, payments, refunds, shop orders.',           true,  true),
  ('content_editor',       'Content Editor',              'Pages, blog, media, testimonials, partners, leadership, SEO.', true,  true),
  ('client',               'Client / Family',             'Client portal (Phase 4).',                                    false, true),
  ('worker',               'Worker',                      'Worker portal "My ChaseCare" (Phase 4).',                     false, true),
  ('professional',         'Healthcare Professional',     'Worker portal with professional profile (Phase 4).',          false, true),
  ('learner',              'Learner',                     'Student, trainee or parent learner (Phase 7).',               false, true);

-- Default permissions per staff role. super_admin is handled in has_permission().
insert into public.role_permissions (role_key, permission_key)
select r.role_key, p.key
from (values
  ('operations_manager',   array['enquiries', 'clients', 'workforce', 'care_ops', 'reports'],                   array['view','create','edit','export']),
  ('recruitment_officer',  array['enquiries', 'workforce'],                                                    array['view','create','edit','export']),
  ('training_coordinator', array['academy', 'enquiries', 'community'],                                         array['view','create','edit','export']),
  ('wellbeing_officer',    array['wellbeing'],                                                                 array['view','create','edit','export']),
  ('bookings_finance',     array['bookings', 'payments', 'shop', 'enquiries'],                                 array['view','create','edit','export']),
  ('content_editor',       array['content', 'blog', 'media', 'communications'],                                array['view','create','edit','delete'])
) as r(role_key, sections, actions)
join public.permissions p on p.section = any (r.sections) and p.action = any (r.actions);

-- Every staff role may view the media library and the site content (needed to render the dashboard).
insert into public.role_permissions (role_key, permission_key)
select r.key, p.key
from public.roles r
cross join (values ('media.view'), ('content.view'), ('settings.view')) as p(key)
where r.is_staff and r.key <> 'super_admin'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Security settings (single row). Read by has_permission().
-- -----------------------------------------------------------------------------
create table private.security_settings (
  id                boolean primary key default true check (id),
  require_staff_mfa boolean not null default true
);
insert into private.security_settings default values;
comment on column private.security_settings.require_staff_mfa is
  'When true, staff permissions only apply to sessions that passed two-factor authentication (aal2).';

-- -----------------------------------------------------------------------------
-- Permission helpers used by RLS policies
-- -----------------------------------------------------------------------------
create function public.current_user_has_role(role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and ur.role_key = role
      and p.is_active
  );
$$;

create function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    -- Two-factor check for staff permissions.
    (
      not (select s.require_staff_mfa from private.security_settings s)
      or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    )
    and exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      left join public.role_permissions rp
        on rp.role_key = ur.role_key and rp.permission_key = perm
      where ur.user_id = (select auth.uid())
        and p.is_active
        and (ur.role_key = 'super_admin' or rp.permission_key is not null)
    );
$$;
comment on function public.has_permission(text) is
  'True when the signed-in, active user holds a role granting <section>.<action> (super_admin holds all). Requires aal2 when staff MFA is enforced.';

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      not (select s.require_staff_mfa from private.security_settings s)
      or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    )
    and exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.key = ur.role_key
      join public.profiles p on p.id = ur.user_id
      where ur.user_id = (select auth.uid()) and r.is_staff and p.is_active
    );
$$;

-- Lets the dashboard ask "what can I do?" in one call.
create function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select p.key
  from public.permissions p
  where public.has_permission(p.key)
  order by p.key;
$$;

revoke execute on function public.has_permission(text), public.is_staff(), public.current_user_has_role(text), public.my_permissions() from public, anon;
grant execute on function public.has_permission(text), public.is_staff(), public.current_user_has_role(text), public.my_permissions() to authenticated;

-- -----------------------------------------------------------------------------
-- Audit log (who changed what, when)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,          -- auth.uid() of the person making the change (null = system/service)
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb
);
create index audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);

create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec_id text;
begin
  rec_id := coalesce(
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'id',
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'key',
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end ->> 'user_id'
  );
  insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  values (
    (select auth.uid()),
    tg_op,
    tg_table_name,
    rec_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- Helper to attach auditing to a table in later migrations.
create function private.enable_audit(target regclass)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format(
    'create trigger audit_row_change after insert or update or delete on %s for each row execute function private.audit_row_change()',
    target
  );
end;
$$;

select private.enable_audit('public.profiles');
select private.enable_audit('public.roles');
select private.enable_audit('public.role_permissions');
select private.enable_audit('public.user_roles');

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;
alter table public.audit_log        enable row level security;

-- Profiles: you can see and edit your own; staff with users.* manage everyone.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: staff read" on public.profiles
  for select to authenticated using (public.has_permission('users.view'));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "profiles: staff update" on public.profiles
  for update to authenticated
  using (public.has_permission('users.edit'))
  with check (public.has_permission('users.edit'));

-- Users may not switch their own account on/off.
create function private.protect_profile_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_active is distinct from old.is_active
     and (select auth.uid()) is not null
     and not public.has_permission('users.edit') then
    raise exception 'Only staff with users.edit can change account status';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_status
  before update on public.profiles
  for each row execute function private.protect_profile_status();

-- Roles & permission catalogue: readable by any signed-in user; managed by users.edit.
create policy "roles: read" on public.roles
  for select to authenticated using (true);
create policy "roles: manage" on public.roles
  for all to authenticated
  using (public.has_permission('users.edit') and not is_system)
  with check (public.has_permission('users.edit') and not is_system);

create policy "permissions: read" on public.permissions
  for select to authenticated using (true);

create policy "role_permissions: read" on public.role_permissions
  for select to authenticated using (true);
create policy "role_permissions: manage" on public.role_permissions
  for all to authenticated
  using (public.has_permission('users.edit') and role_key <> 'super_admin')
  with check (public.has_permission('users.edit') and role_key <> 'super_admin');

-- User roles: see your own; users.view sees all; users.edit assigns.
-- Only a super admin can grant or remove super_admin.
create policy "user_roles: read own" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_roles: staff read" on public.user_roles
  for select to authenticated using (public.has_permission('users.view'));
create policy "user_roles: grant" on public.user_roles
  for insert to authenticated
  with check (
    public.has_permission('users.edit')
    and (role_key <> 'super_admin' or public.current_user_has_role('super_admin'))
  );
create policy "user_roles: revoke" on public.user_roles
  for delete to authenticated
  using (
    public.has_permission('users.edit')
    and (role_key <> 'super_admin' or public.current_user_has_role('super_admin'))
  );

-- Never remove the last active super admin.
create function private.keep_one_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role_key = 'super_admin' and not exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role_key = 'super_admin' and ur.user_id <> old.user_id and p.is_active
  ) then
    raise exception 'Cannot remove the last active super admin';
  end if;
  return old;
end;
$$;
create trigger user_roles_keep_one_super_admin
  before delete on public.user_roles
  for each row execute function private.keep_one_super_admin();

-- Record who granted a role.
create function private.set_granted_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.granted_by := coalesce(new.granted_by, (select auth.uid()));
  return new;
end;
$$;
create trigger user_roles_set_granted_by
  before insert on public.user_roles
  for each row execute function private.set_granted_by();

-- Audit log: read-only, audit.view only. Rows are written by triggers.
create policy "audit_log: read" on public.audit_log
  for select to authenticated using (public.has_permission('audit.view'));
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Bootstrap: make the first owner account a super admin.
-- Run from the Supabase SQL editor (or psql) as the postgres user:
--   select private.grant_role_by_email('owner@example.com', 'super_admin');
-- -----------------------------------------------------------------------------
create function private.grant_role_by_email(user_email text, role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(user_email);
  if uid is null then
    raise exception 'No auth user with email %', user_email;
  end if;
  insert into public.user_roles (user_id, role_key) values (uid, role)
  on conflict do nothing;
end;
$$;
revoke all on function private.grant_role_by_email(text, text) from public, anon, authenticated;
