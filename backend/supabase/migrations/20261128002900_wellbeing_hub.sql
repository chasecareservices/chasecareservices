-- =============================================================================
-- ChaseCare Wellbeing Hub: support for the people who provide care.
--
--   wellbeing_services   counselling, health, laboratory and insurance partners
--                        and benefits (public or for care workers only)
--   wellbeing_resources  health education, articles, videos, webinars and
--                        support sessions (public or for care workers only)
--   wellbeing_requests   a care worker asks for support, in confidence
--   wellbeing_messages   the conversation about a request (plus internal notes)
--
-- Requests are confidential: only the worker who asked and staff with
-- wellbeing.view can read them. The activity log records that a request was
-- made or changed, never what it says.
-- =============================================================================

-- ---------- Services & partners ----------
create table public.wellbeing_services (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 200),
  kind            text not null check (kind in ('counselling', 'health', 'laboratory', 'insurance', 'other')),
  provider        text check (char_length(provider) <= 200),
  description     text check (char_length(description) <= 3000),
  benefit         text check (char_length(benefit) <= 300),         -- e.g. "Free for ChaseCare workers"
  how_to_access   text check (char_length(how_to_access) <= 1000),
  location        text check (char_length(location) <= 200),
  phone           text check (char_length(phone) <= 40),
  website_url     text check (website_url ~* '^https?://' and char_length(website_url) <= 500),
  audience        text not null default 'workers' check (audience in ('public', 'workers')),
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.wellbeing_services is 'Wellbeing Hub services and partners: counselling, health, laboratories, insurance.';

-- ---------- Resources, webinars & sessions ----------
create table public.wellbeing_resources (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 2 and 200),
  kind            text not null check (kind in ('article', 'video', 'webinar', 'support_session', 'leaflet', 'link')),
  summary         text check (char_length(summary) <= 600),
  url             text check (url ~* '^https?://' and char_length(url) <= 500),
  starts_at       timestamptz,                                     -- webinars and sessions
  place           text check (char_length(place) <= 200),          -- "Online (Zoom)" or a venue
  audience        text not null default 'workers' check (audience in ('public', 'workers')),
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.wellbeing_resources is 'Wellbeing Hub health education, resources, webinars and support sessions.';
create index wellbeing_resources_starts_idx on public.wellbeing_resources (starts_at) where starts_at is not null;

create trigger wellbeing_services_set_updated_at before update on public.wellbeing_services
  for each row execute function private.set_updated_at();
create trigger wellbeing_resources_set_updated_at before update on public.wellbeing_resources
  for each row execute function private.set_updated_at();

-- ---------- Confidential requests ----------
create sequence public.wellbeing_request_number_seq;

create table public.wellbeing_requests (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique default ('WB-' || lpad(nextval('public.wellbeing_request_number_seq')::text, 5, '0')),
  worker_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('counselling', 'health', 'laboratory', 'insurance', 'other')),
  urgency         text not null default 'routine' check (urgency in ('routine', 'soon', 'urgent')),
  contact_method  text not null default 'phone' check (contact_method in ('phone', 'whatsapp', 'email', 'in_person')),
  contact_times   text check (char_length(contact_times) <= 200),
  message         text not null check (char_length(message) between 2 and 4000),
  status          text not null default 'new' check (status in ('new', 'in_progress', 'referred', 'closed')),
  assigned_to     uuid references public.profiles (id) on delete set null,
  service_id      uuid references public.wellbeing_services (id) on delete set null,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.wellbeing_requests is 'Confidential wellbeing support requests from care workers.';
create index wellbeing_requests_worker_idx on public.wellbeing_requests (worker_id, created_at desc);
create index wellbeing_requests_status_idx on public.wellbeing_requests (status, created_at desc);

create table public.wellbeing_messages (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.wellbeing_requests (id) on delete cascade,
  author_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  internal        boolean not null default false,   -- true: a note only the wellbeing team sees
  created_at      timestamptz not null default now()
);
comment on table public.wellbeing_messages is 'Messages between a care worker and the wellbeing team, and internal notes.';
create index wellbeing_messages_request_idx on public.wellbeing_messages (request_id, created_at);

-- The request's own details never change after it is sent; closing sets closed_at.
create function private.guard_wellbeing_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reference <> old.reference or new.worker_id <> old.worker_id or new.message <> old.message
     or new.kind <> old.kind or new.created_at <> old.created_at then
    raise exception 'A wellbeing request cannot be rewritten once sent.' using errcode = '42501';
  end if;
  if new.status = 'closed' and old.status <> 'closed' then
    new.closed_at := now();
  elsif new.status <> 'closed' then
    new.closed_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger wellbeing_requests_guard before update on public.wellbeing_requests
  for each row execute function private.guard_wellbeing_request();

-- A new message brings the request back to the top of the inbox.
create function private.touch_wellbeing_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.wellbeing_requests set updated_at = now() where id = new.request_id;
  return new;
end;
$$;

create trigger wellbeing_messages_touch after insert on public.wellbeing_messages
  for each row execute function private.touch_wellbeing_request();

-- Activity log without the confidential text: who changed which request, and its status.
create function private.audit_wellbeing_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  keep text[] := array['id', 'reference', 'request_id', 'status', 'urgency', 'assigned_to', 'internal'];
  o jsonb;
  n jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select jsonb_object_agg(key, value) into o from jsonb_each(to_jsonb(old)) where key = any (keep);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select jsonb_object_agg(key, value) into n from jsonb_each(to_jsonb(new)) where key = any (keep);
  end if;
  insert into public.audit_log (actor_id, action, table_name, record_id, old_data, new_data)
  values ((select auth.uid()), tg_op, tg_table_name, coalesce(n, o) ->> 'id', o, n);
  return coalesce(new, old);
end;
$$;

create trigger wellbeing_requests_audit after insert or update or delete on public.wellbeing_requests
  for each row execute function private.audit_wellbeing_change();
create trigger wellbeing_messages_audit after insert or update or delete on public.wellbeing_messages
  for each row execute function private.audit_wellbeing_change();

-- Counts for the dashboard: requests waiting for a first reply, and urgent ones still open.
create function public.wellbeing_counts()
returns table (new_requests bigint, urgent_open bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) filter (where status = 'new'),
         count(*) filter (where urgency = 'urgent' and status <> 'closed')
  from public.wellbeing_requests;
$$;

-- ---------- Row Level Security ----------
alter table public.wellbeing_services enable row level security;
alter table public.wellbeing_resources enable row level security;
alter table public.wellbeing_requests enable row level security;
alter table public.wellbeing_messages enable row level security;

-- Services & resources: the public sees published public items; care workers see
-- everything published; the wellbeing team manages them.
create policy "wellbeing_services: public read" on public.wellbeing_services
  for select to anon, authenticated using (status = 'published' and audience = 'public');
create policy "wellbeing_services: workers read" on public.wellbeing_services
  for select to authenticated using (status = 'published' and public.current_user_has_role('worker'));
create policy "wellbeing_services: staff read" on public.wellbeing_services
  for select to authenticated using (public.has_permission('wellbeing.view'));
create policy "wellbeing_services: add" on public.wellbeing_services
  for insert to authenticated with check (public.has_permission('wellbeing.create'));
create policy "wellbeing_services: update" on public.wellbeing_services
  for update to authenticated using (public.has_permission('wellbeing.edit')) with check (public.has_permission('wellbeing.edit'));
create policy "wellbeing_services: delete" on public.wellbeing_services
  for delete to authenticated using (public.has_permission('wellbeing.delete'));

create policy "wellbeing_resources: public read" on public.wellbeing_resources
  for select to anon, authenticated using (status = 'published' and audience = 'public');
create policy "wellbeing_resources: workers read" on public.wellbeing_resources
  for select to authenticated using (status = 'published' and public.current_user_has_role('worker'));
create policy "wellbeing_resources: staff read" on public.wellbeing_resources
  for select to authenticated using (public.has_permission('wellbeing.view'));
create policy "wellbeing_resources: add" on public.wellbeing_resources
  for insert to authenticated with check (public.has_permission('wellbeing.create'));
create policy "wellbeing_resources: update" on public.wellbeing_resources
  for update to authenticated using (public.has_permission('wellbeing.edit')) with check (public.has_permission('wellbeing.edit'));
create policy "wellbeing_resources: delete" on public.wellbeing_resources
  for delete to authenticated using (public.has_permission('wellbeing.delete'));

-- Requests: a care worker sends and reads their own; only the wellbeing team reads the rest.
create policy "wellbeing_requests: read own" on public.wellbeing_requests
  for select to authenticated using (worker_id = (select auth.uid()));
create policy "wellbeing_requests: team read" on public.wellbeing_requests
  for select to authenticated using (public.has_permission('wellbeing.view'));
create policy "wellbeing_requests: worker sends" on public.wellbeing_requests
  for insert to authenticated
  with check (
    worker_id = (select auth.uid()) and public.current_user_has_role('worker')
    and status = 'new' and assigned_to is null and service_id is null and closed_at is null
  );
create policy "wellbeing_requests: team updates" on public.wellbeing_requests
  for update to authenticated using (public.has_permission('wellbeing.edit')) with check (public.has_permission('wellbeing.edit'));
create policy "wellbeing_requests: delete" on public.wellbeing_requests
  for delete to authenticated using (public.has_permission('wellbeing.delete'));

-- Messages: the worker sees the conversation on their own request (not internal notes)
-- and can reply while it is open; the team sees and writes everything.
create policy "wellbeing_messages: worker reads" on public.wellbeing_messages
  for select to authenticated
  using (
    not internal and exists (
      select 1 from public.wellbeing_requests r where r.id = request_id and r.worker_id = (select auth.uid())
    )
  );
create policy "wellbeing_messages: team reads" on public.wellbeing_messages
  for select to authenticated using (public.has_permission('wellbeing.view'));
create policy "wellbeing_messages: worker replies" on public.wellbeing_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid()) and not internal and exists (
      select 1 from public.wellbeing_requests r
      where r.id = request_id and r.worker_id = (select auth.uid()) and r.status <> 'closed'
    )
  );
create policy "wellbeing_messages: team writes" on public.wellbeing_messages
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.has_permission('wellbeing.edit'));

-- The wellbeing team needs the names (and phone) of care workers, and of staff on a thread.
create policy "profiles: wellbeing team reads" on public.profiles
  for select to authenticated
  using (
    public.has_permission('wellbeing.view') and (
      public.is_worker_profile(id)
      or exists (select 1 from public.wellbeing_messages m where m.author_id = profiles.id)
      or exists (select 1 from public.wellbeing_requests r where r.assigned_to = profiles.id)
    )
  );

-- ---------- Grants ----------
revoke all on public.wellbeing_services, public.wellbeing_resources from anon;
grant select on public.wellbeing_services, public.wellbeing_resources to anon;
grant select, insert, update, delete on public.wellbeing_services, public.wellbeing_resources to authenticated;
revoke all on public.wellbeing_requests, public.wellbeing_messages from anon;
grant select, insert, update, delete on public.wellbeing_requests to authenticated;
grant select, insert on public.wellbeing_messages to authenticated;
revoke truncate, references, trigger on public.wellbeing_services, public.wellbeing_resources,
  public.wellbeing_requests, public.wellbeing_messages from authenticated;
grant all on public.wellbeing_services, public.wellbeing_resources, public.wellbeing_requests, public.wellbeing_messages to service_role;
grant usage on sequence public.wellbeing_request_number_seq to authenticated, service_role;

revoke all on function public.wellbeing_counts() from public, anon;
grant execute on function public.wellbeing_counts() to authenticated;
revoke all on function private.guard_wellbeing_request(), private.touch_wellbeing_request(), private.audit_wellbeing_change() from public;

select private.enable_audit('public.wellbeing_services');
select private.enable_audit('public.wellbeing_resources');
