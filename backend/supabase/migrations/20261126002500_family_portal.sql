-- =============================================================================
-- Client & family portal.
--
-- The office links a family member (role "client") to the person they care
-- about. Family members can then see, for that person only:
--   * the visit schedule (who is coming, when; first names only)
--   * visit reports, once the office has read them ("reviewed")
--   * the care plan
-- and send the office a message. They never see visit locations, office notes,
-- care-worker concerns or incident reports: the office follows those up in
-- person, and some (safeguarding) must not go to family first.
-- =============================================================================

create table public.care_family_links (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.care_clients (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  relationship  text check (char_length(relationship) <= 60),   -- e.g. Daughter, Son, Guardian
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  unique (client_id, user_id)
);
comment on table public.care_family_links is 'Which family members (role "client") can follow which client in the family portal.';
create index care_family_links_user_idx on public.care_family_links (user_id);

create trigger care_family_links_set_updated_at
  before update on public.care_family_links
  for each row execute function private.set_updated_at();

create function public.is_family_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_has_role('client');
$$;
comment on function public.is_family_member() is 'True when the signed-in, active user has the Client / Family role.';

create function public.is_family_of(client uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_has_role('client') and exists (
    select 1 from public.care_family_links l
    join public.care_clients c on c.id = l.client_id
    where l.client_id = client and l.user_id = (select auth.uid()) and l.is_active and c.is_active
  );
$$;

-- ---------- What family can read directly ----------
alter table public.care_family_links enable row level security;

create policy "care_family_links: own read" on public.care_family_links
  for select to authenticated using (user_id = (select auth.uid()) and is_active);
create policy "care_family_links: office read" on public.care_family_links
  for select to authenticated using (public.has_permission('clients.view'));
create policy "care_family_links: office manage" on public.care_family_links
  for all to authenticated
  using (public.has_permission('clients.edit'))
  with check (public.has_permission('clients.edit'));

create policy "care_clients: family read" on public.care_clients
  for select to authenticated using (public.is_family_of(id));
create policy "care_plans: family read" on public.care_plans
  for select to authenticated using (public.is_family_of(client_id));

revoke all on public.care_family_links from anon;
grant select, insert, update, delete on public.care_family_links to authenticated;
revoke truncate, references, trigger on public.care_family_links from authenticated;
grant all on public.care_family_links to service_role;

-- ---------- Reports and visits: only the parts family should see ----------
create function public.family_visit_reports(client uuid, max_rows integer default 30)
returns table (
  id uuid, reference text, visit_date date, start_time time, end_time time, mood text,
  activities text[], meals text, medication text, summary text, tasks_done text[],
  worker_first_name text, reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_family_of(client) then
    raise exception 'You can only see reports for your own family member' using errcode = '42501';
  end if;
  return query
    select r.id, r.reference, r.visit_date, r.start_time, r.end_time, r.mood::text,
           r.activities, r.meals::text, r.medication::text, r.summary, r.tasks_done,
           split_part(coalesce(p.full_name, 'Care worker'), ' ', 1), r.reviewed_at
    from public.care_reports r
    left join public.profiles p on p.id = r.worker_id
    where r.client_id = client and r.status = 'reviewed'
    order by r.visit_date desc, r.submitted_at desc
    limit least(greatest(max_rows, 1), 100);
end;
$$;
comment on function public.family_visit_reports is 'Visit reports the office has read, for a family member of the client. No locations, concerns or office notes.';

create function public.family_visits(client uuid, from_date date, to_date date)
returns table (id uuid, shift_date date, start_time time, end_time time, visit_status text, worker_first_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_family_of(client) then
    raise exception 'You can only see visits for your own family member' using errcode = '42501';
  end if;
  if to_date - from_date > 62 then
    raise exception 'Choose a shorter period' using errcode = '22023';
  end if;
  return query
    select s.id, s.shift_date, s.start_time, s.end_time, s.visit_status,
           split_part(coalesce(p.full_name, 'Care worker'), ' ', 1)
    from public.care_shift_status s
    left join public.profiles p on p.id = s.worker_id
    where s.client_id = client and s.shift_date between from_date and to_date
    order by s.shift_date, s.start_time;
end;
$$;
comment on function public.family_visits is 'Booked visits for a family member of the client, with the care worker''s first name.';

-- ---------- Messages to the office (arrive as an enquiry) ----------
create function public.family_message_office(client uuid, message text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  who    record;
  client_name text;
begin
  if not public.is_family_of(client) then
    raise exception 'You can only message about your own family member' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(message, ''))) < 2 or char_length(message) > 2000 then
    raise exception 'Write a message of up to 2000 characters' using errcode = '22023';
  end if;
  if (select count(*) from public.enquiries e
      where e.payload ->> 'family_user_id' = (select auth.uid())::text and e.created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many messages today. Please call the office.' using errcode = '54000';
  end if;

  select coalesce(p.full_name, u.email) as name, u.email, p.phone into who
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = (select auth.uid());
  select full_name into client_name from public.care_clients where id = client;

  insert into public.enquiries (enquiry_type, full_name, email, phone, subject, message, payload, consent_given, source_page)
  values ('contact', left(who.name, 200), who.email, who.phone, left('Family message about ' || client_name, 200), trim(message),
          jsonb_build_object('client_id', client, 'family_user_id', (select auth.uid())), true, '/family')
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------- For the office: family contacts with their email ----------
create function public.list_family_contacts(client uuid)
returns table (link_id uuid, user_id uuid, full_name text, email text, relationship text, is_active boolean, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('clients.view') then
    raise exception 'You do not have permission to see family contacts' using errcode = '42501';
  end if;
  return query
    select l.id, l.user_id, p.full_name, u.email::text, l.relationship, l.is_active, u.last_sign_in_at
    from public.care_family_links l
    join public.profiles p on p.id = l.user_id
    join auth.users u on u.id = l.user_id
    where l.client_id = client
    order by l.is_active desc, p.full_name;
end;
$$;

revoke all on function public.is_family_member(), public.is_family_of(uuid), public.family_visit_reports(uuid, integer),
  public.family_visits(uuid, date, date), public.family_message_office(uuid, text), public.list_family_contacts(uuid) from public, anon;
grant execute on function public.is_family_member(), public.is_family_of(uuid), public.family_visit_reports(uuid, integer),
  public.family_visits(uuid, date, date), public.family_message_office(uuid, text), public.list_family_contacts(uuid) to authenticated;

select private.enable_audit('public.care_family_links');
