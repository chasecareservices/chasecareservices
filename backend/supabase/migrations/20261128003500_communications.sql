-- =============================================================================
-- Communications [dashboard spec §3.14]:
--
--   email_templates          the owner's own wording for automatic emails
--                            (subject, heading, message); empty = built-in wording
--   portal_announcements     messages to care workers and/or families, shown in
--                            their portal and optionally emailed
--   policies                 the policies library for care workers [§19], with
--   policy_acknowledgements  "I have read and understood" per version
--
-- Staff with communications.* manage them. Policies can also be managed by
-- workforce.edit (recruitment / operations).
-- =============================================================================

-- ---------- Email templates ----------
create table public.email_templates (
  key         text primary key check (key ~ '^[a-z_]{3,40}$'),
  subject     text check (char_length(subject) <= 200),
  heading     text check (char_length(heading) <= 200),
  message     text check (char_length(message) <= 2000),
  updated_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);
comment on table public.email_templates is 'Custom wording for automatic emails. Missing or empty fields use the built-in wording.';
create trigger email_templates_set_updated_at before update on public.email_templates
  for each row execute function private.set_updated_at();

-- ---------- Portal announcements ----------
create table public.portal_announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 2 and 150),
  body          text not null check (char_length(body) between 2 and 5000),
  audience      text not null check (audience in ('workers', 'families', 'both')),
  important     boolean not null default false,
  publish_at    timestamptz not null default now(),
  expires_at    timestamptz check (expires_at is null or expires_at > publish_at),
  status        text not null default 'draft' check (status in ('draft', 'published')),
  emailed_at    timestamptz,
  emailed_count integer,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.portal_announcements is 'Announcements shown in the care worker and family portals.';
create index portal_announcements_live_idx on public.portal_announcements (status, publish_at desc);
create trigger portal_announcements_set_updated_at before update on public.portal_announcements
  for each row execute function private.set_updated_at();

-- ---------- Policies ----------
create table public.policies (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 2 and 200),
  category      text check (char_length(category) <= 80),
  summary       text check (char_length(summary) <= 600),
  body          text check (char_length(body) <= 60000),
  document_url  text check (document_url ~* '^https://' and char_length(document_url) <= 500),
  must_read     boolean not null default true,
  version       integer not null default 1 check (version >= 1),
  status        text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at  timestamptz,
  sort_order    integer not null default 0,
  updated_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.policies is 'Policies and procedures for care workers. A new version asks everyone to read it again.';
create trigger policies_set_updated_at before update on public.policies
  for each row execute function private.set_updated_at();

-- Publishing stamps the date; a published policy edited as "new version" bumps the version.
create function private.stamp_policy()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published' or new.version <> old.version) then
    new.published_at := now();
  end if;
  if tg_op = 'UPDATE' and new.version < old.version then
    raise exception 'A policy version cannot go backwards' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger policies_stamp before insert or update on public.policies
  for each row execute function private.stamp_policy();

create table public.policy_acknowledgements (
  policy_id        uuid not null references public.policies (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  version          integer not null,
  acknowledged_at  timestamptz not null default now(),
  primary key (policy_id, user_id, version)
);
comment on table public.policy_acknowledgements is 'Who has read and understood which version of a policy.';

-- A care worker confirms they have read the current version (checked here, not trusted from the browser).
create function public.acknowledge_policy(policy uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v integer;
begin
  if not public.is_care_worker() then
    raise exception 'Care workers only' using errcode = '42501';
  end if;
  select p.version into v from public.policies p where p.id = policy and p.status = 'published';
  if v is null then raise exception 'Policy not found' using errcode = 'P0002'; end if;
  insert into public.policy_acknowledgements (policy_id, user_id, version) values (policy, (select auth.uid()), v)
  on conflict do nothing;
  return v;
end;
$$;

-- How many must-read policies the signed-in care worker still needs to read.
create function public.my_policies_to_read()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.policies p
  where p.status = 'published' and p.must_read and public.is_care_worker()
    and not exists (select 1 from public.policy_acknowledgements a
                    where a.policy_id = p.id and a.user_id = (select auth.uid()) and a.version = p.version);
$$;

-- ---------- Row Level Security ----------
alter table public.email_templates enable row level security;
alter table public.portal_announcements enable row level security;
alter table public.policies enable row level security;
alter table public.policy_acknowledgements enable row level security;

create policy "email_templates: staff read" on public.email_templates
  for select to authenticated using (public.has_permission('communications.view'));
create policy "email_templates: staff write" on public.email_templates
  for all to authenticated using (public.has_permission('communications.edit')) with check (public.has_permission('communications.edit'));

create policy "portal_announcements: audience reads" on public.portal_announcements
  for select to authenticated
  using (status = 'published' and publish_at <= now() and (expires_at is null or expires_at > now())
         and ((audience in ('workers', 'both') and public.is_care_worker())
              or (audience in ('families', 'both') and public.is_family_member())));
create policy "portal_announcements: staff read" on public.portal_announcements
  for select to authenticated using (public.has_permission('communications.view'));
create policy "portal_announcements: staff write" on public.portal_announcements
  for all to authenticated using (public.has_permission('communications.edit')) with check (public.has_permission('communications.edit'));

create policy "policies: care workers read published" on public.policies
  for select to authenticated using (status = 'published' and public.is_care_worker());
create policy "policies: staff read" on public.policies
  for select to authenticated using (public.has_permission('communications.view') or public.has_permission('workforce.view'));
create policy "policies: staff write" on public.policies
  for all to authenticated
  using (public.has_permission('communications.edit') or public.has_permission('workforce.edit'))
  with check (public.has_permission('communications.edit') or public.has_permission('workforce.edit'));

create policy "policy_acknowledgements: read own" on public.policy_acknowledgements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "policy_acknowledgements: staff read" on public.policy_acknowledgements
  for select to authenticated using (public.has_permission('communications.view') or public.has_permission('workforce.view'));

-- ---------- Grants ----------
revoke all on public.email_templates, public.portal_announcements, public.policies, public.policy_acknowledgements from anon;
grant select, insert, update, delete on public.email_templates, public.portal_announcements, public.policies to authenticated;
grant select on public.policy_acknowledgements to authenticated;
revoke truncate, references, trigger on public.email_templates, public.portal_announcements, public.policies, public.policy_acknowledgements from authenticated;
grant all on public.email_templates, public.portal_announcements, public.policies, public.policy_acknowledgements to service_role;
revoke all on function public.acknowledge_policy(uuid), public.my_policies_to_read() from public, anon;
grant execute on function public.acknowledge_policy(uuid), public.my_policies_to_read() to authenticated;
revoke all on function private.stamp_policy() from public;

select private.enable_audit('public.email_templates');
select private.enable_audit('public.portal_announcements');
select private.enable_audit('public.policies');
