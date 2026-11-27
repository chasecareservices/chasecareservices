-- =============================================================================
-- Community & events, including the Monthly ChaseCare Community Forum [§22, §23].
--
--   community_events       forums, outreach, awareness, school and health
--                          programmes, volunteering, other community events
--   community_event_links  the online joining link (only staff read it; it is
--                          emailed to people who register to join online)
--   event_registrations    who registered, how they'll join, attendance
--
-- The forum is held on the third Thursday of every month. ensure_forums()
-- creates the next three forums if they don't exist yet, so the website always
-- has a forum to register for. Staff set the topic, speaker and venue.
-- Staff with community.* manage everything; the public registers through
-- register_for_event().
-- =============================================================================

create table public.community_events (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  kind               text not null default 'community' check (kind in (
                       'forum', 'outreach', 'awareness', 'school', 'health', 'volunteering', 'community')),
  title              text not null check (char_length(title) between 2 and 200),
  topic              text check (char_length(topic) <= 120),
  summary            text check (char_length(summary) <= 400),
  description        text check (char_length(description) <= 5000),
  speaker            text check (char_length(speaker) <= 300),
  starts_at          timestamptz not null,
  ends_at            timestamptz check (ends_at is null or ends_at > starts_at),
  venue              text check (char_length(venue) <= 300),
  online             boolean not null default false,          -- people can join online
  capacity           integer check (capacity is null or capacity > 0),
  registration_open  boolean not null default true,
  status             text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'archived')),
  image_path         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.community_events is 'Community events, including the Monthly Community Forum (third Thursday).';
create index community_events_starts_idx on public.community_events (starts_at);
-- One forum per day.
create unique index community_events_one_forum_a_day on public.community_events (((starts_at at time zone 'UTC')::date)) where kind = 'forum';

create trigger community_events_set_updated_at before update on public.community_events
  for each row execute function private.set_updated_at();

create table public.community_event_links (
  event_id    uuid primary key references public.community_events (id) on delete cascade,
  online_url  text not null check (online_url ~* '^https://' and char_length(online_url) <= 500),
  updated_at  timestamptz not null default now()
);
comment on table public.community_event_links is 'Online joining links: emailed to registrants, never shown publicly.';

create table public.event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.community_events (id) on delete cascade,
  full_name     text not null check (char_length(full_name) between 2 and 120),
  email         text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone         text check (char_length(phone) <= 40),
  attend_mode   text not null default 'in_person' check (attend_mode in ('in_person', 'online')),
  organisation  text check (char_length(organisation) <= 200),
  needs         text check (char_length(needs) <= 1000),    -- access needs, questions for the speaker
  status        text not null default 'registered' check (status in ('registered', 'cancelled', 'attended', 'no_show')),
  token         uuid not null unique default gen_random_uuid(), -- for the "can't come any more" link
  source        text not null default 'website' check (source in ('website', 'staff')),
  confirmed_at  timestamptz,                                  -- confirmation email sent
  reminded_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (email is not null or phone is not null)
);
comment on table public.event_registrations is 'Registrations for community events and the Monthly Forum.';
create index event_registrations_event_idx on public.event_registrations (event_id, created_at);
create unique index event_registrations_one_per_email on public.event_registrations (event_id, lower(email)) where email is not null and status <> 'cancelled';

create trigger event_registrations_set_updated_at before update on public.event_registrations
  for each row execute function private.set_updated_at();

-- ---------- The Monthly Forum: third Thursday, created ahead of time ----------
create function private.third_thursday(month_start date)
returns date
language sql
immutable
set search_path = ''
as $$
  select (month_start + ((4 - extract(dow from month_start)::int + 7) % 7) + 14)::date;
$$;

-- Creates (published) forums for the next three months if missing. Safe to call often.
create function public.ensure_forums()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m date;
  d date;
begin
  for i in 0..3 loop
    m := (date_trunc('month', now() at time zone 'UTC') + make_interval(months => i))::date;
    d := private.third_thursday(m);
    continue when d < (now() at time zone 'UTC')::date;
    insert into public.community_events (slug, kind, title, summary, starts_at, ends_at, venue, online, status)
    values (
      'forum-' || to_char(d, 'YYYY-MM'),
      'forum',
      'Monthly ChaseCare Community Forum: ' || trim(to_char(d, 'FMMonth YYYY')),
      'An open forum for families, carers, professionals and anyone interested in care.',
      (d + time '17:00') at time zone 'UTC',
      (d + time '19:00') at time zone 'UTC',
      'To be confirmed',
      true,
      'published'
    )
    on conflict do nothing;
  end loop;
end;
$$;

-- ---------- Public registration ----------
-- Seats left (null = no limit). Visible for published events only.
create function public.event_places_left(event uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when e.capacity is null then null
              else greatest(e.capacity - (select count(*) from public.event_registrations r
                                          where r.event_id = e.id and r.status in ('registered', 'attended'))::int, 0) end
  from public.community_events e
  where e.id = event and e.status = 'published';
$$;

create function public.register_for_event(
  event         uuid,
  full_name     text,
  consent_given boolean,
  email         text default null,
  phone         text default null,
  attend_mode   text default 'in_person',
  organisation  text default null,
  needs         text default null,
  website       text default null   -- honeypot
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  e          public.community_events;
  new_id     uuid;
  clean_mail text := nullif(lower(trim(email)), '');
  clean_tel  text := nullif(trim(phone), '');
  mode       text := coalesce(nullif(attend_mode, ''), 'in_person');
begin
  if nullif(trim(website), '') is not null then
    return gen_random_uuid();
  end if;
  if consent_given is not true then
    raise exception 'Consent is required' using errcode = '22023';
  end if;
  if char_length(coalesce(trim(full_name), '')) < 2 then
    raise exception 'Name is required' using errcode = '22023';
  end if;
  if clean_mail is null and clean_tel is null then
    raise exception 'An email address or phone number is required' using errcode = '22023';
  end if;

  select * into e from public.community_events c where c.id = event for update;
  if not found or e.status <> 'published' then
    raise exception 'This event is not open for registration' using errcode = 'P0002';
  end if;
  if not e.registration_open or coalesce(e.ends_at, e.starts_at + interval '2 hours') < now() then
    raise exception 'Registration for this event has closed' using errcode = '55000';
  end if;
  if mode = 'online' and not e.online then
    mode := 'in_person';
  end if;
  if mode = 'in_person' and e.capacity is not null and (
    select count(*) from public.event_registrations r where r.event_id = e.id and r.status in ('registered', 'attended')
  ) >= e.capacity then
    raise exception 'This event is full' using errcode = '53400';
  end if;
  -- At most 10 registrations per email address per hour, across events.
  if clean_mail is not null and (
    select count(*) from public.event_registrations r where lower(r.email) = clean_mail and r.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Too many registrations. Please try again later.' using errcode = '54000';
  end if;

  insert into public.event_registrations (event_id, full_name, email, phone, attend_mode, organisation, needs)
  values (e.id, left(trim(full_name), 120), clean_mail, left(clean_tel, 40), mode,
          nullif(left(trim(organisation), 200), ''), nullif(left(trim(needs), 1000), ''))
  returning id into new_id;
  return new_id;
exception
  when unique_violation then
    raise exception 'You are already registered for this event' using errcode = '23505';
end;
$$;

-- "I can't come any more": by the private token from the confirmation email.
create function public.cancel_event_registration(registration_token uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text;
begin
  update public.event_registrations r set status = 'cancelled'
  from public.community_events e
  where r.token = registration_token and e.id = r.event_id and r.status = 'registered'
  returning e.title into t;
  return t;  -- null if not found or already cancelled
end;
$$;

-- Counts for the dashboard.
create function public.community_counts()
returns table (upcoming_events bigint, registrations_upcoming bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select (select count(*) from public.community_events where status = 'published' and starts_at > now()),
         (select count(*) from public.event_registrations r join public.community_events e on e.id = r.event_id
          where e.starts_at > now() and r.status = 'registered');
$$;

-- ---------- Row Level Security ----------
alter table public.community_events enable row level security;
alter table public.community_event_links enable row level security;
alter table public.event_registrations enable row level security;

create policy "community_events: public read" on public.community_events
  for select to anon, authenticated using (status in ('published', 'cancelled'));
create policy "community_events: staff read" on public.community_events
  for select to authenticated using (public.has_permission('community.view'));
create policy "community_events: add" on public.community_events
  for insert to authenticated with check (public.has_permission('community.create'));
create policy "community_events: update" on public.community_events
  for update to authenticated using (public.has_permission('community.edit')) with check (public.has_permission('community.edit'));
create policy "community_events: delete" on public.community_events
  for delete to authenticated using (public.has_permission('community.delete'));

create policy "community_event_links: staff" on public.community_event_links
  for select to authenticated using (public.has_permission('community.view'));
create policy "community_event_links: manage" on public.community_event_links
  for all to authenticated using (public.has_permission('community.edit')) with check (public.has_permission('community.edit'));

create policy "event_registrations: staff read" on public.event_registrations
  for select to authenticated using (public.has_permission('community.view'));
create policy "event_registrations: staff add" on public.event_registrations
  for insert to authenticated with check (public.has_permission('community.create') and source = 'staff');
create policy "event_registrations: staff update" on public.event_registrations
  for update to authenticated using (public.has_permission('community.edit')) with check (public.has_permission('community.edit'));
create policy "event_registrations: delete" on public.event_registrations
  for delete to authenticated using (public.has_permission('community.delete'));

-- ---------- Grants ----------
revoke all on public.community_events, public.community_event_links, public.event_registrations from anon;
grant select on public.community_events to anon;
grant select, insert, update, delete on public.community_events, public.community_event_links, public.event_registrations to authenticated;
revoke truncate, references, trigger on public.community_events, public.community_event_links, public.event_registrations from authenticated;
grant all on public.community_events, public.community_event_links, public.event_registrations to service_role;

revoke all on function public.ensure_forums(), public.event_places_left(uuid),
  public.register_for_event(uuid, text, boolean, text, text, text, text, text, text),
  public.cancel_event_registration(uuid), public.community_counts() from public;
grant execute on function public.ensure_forums(), public.event_places_left(uuid),
  public.register_for_event(uuid, text, boolean, text, text, text, text, text, text),
  public.cancel_event_registration(uuid) to anon, authenticated;
grant execute on function public.community_counts() to authenticated;
revoke all on function private.third_thursday(date) from public;

select private.enable_audit('public.community_events');
select private.enable_audit('public.event_registrations');

-- "Community Events" in the Community menu, after the Monthly Forum (if the menu is set up as usual).
insert into public.navigation_items (menu, label, href, parent_id, sort_order)
select 'main', 'Community Events', '/community/events', p.id, 25
from public.navigation_items p
where p.menu = 'main' and p.parent_id is null and p.href = '/community'
  and not exists (select 1 from public.navigation_items n where n.href = '/community/events');

-- The forums for the coming months.
select public.ensure_forums();
