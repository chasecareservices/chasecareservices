-- =============================================================================
-- Enquiries & form submissions inbox.
-- Phase 1 uses it for the Contact form; Phase 2 adds the other public forms,
-- which already have a type here so they land in the same inbox.
-- Spec: doc/BACKEND_SPECIFICATION.md §4.2; doc/ADMIN_DASHBOARD_SPECIFICATION.md §3.4
-- =============================================================================

create type public.enquiry_type as enum (
  'contact',
  'care_request',        -- "I Need Care"
  'worker_application',  -- caregiver / professional registration
  'course_registration',
  'parent_training',
  'student_programme',
  'respite',
  'partnership',         -- incl. schools & hospitals
  'forum_registration'
);

create type public.enquiry_status as enum ('new', 'in_progress', 'contacted', 'converted', 'closed');

create table public.enquiries (
  id                 uuid primary key default gen_random_uuid(),
  enquiry_type       public.enquiry_type not null,
  status             public.enquiry_status not null default 'new',
  full_name          text not null check (char_length(full_name) between 1 and 200),
  email              text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone              text check (char_length(phone) <= 40),
  country            text check (char_length(country) <= 100),     -- country of residence (diaspora)
  subject            text check (char_length(subject) <= 200),
  message            text check (char_length(message) <= 5000),
  payload            jsonb not null default '{}'::jsonb,            -- form-specific fields
  consent_given      boolean not null check (consent_given),
  consent_version    text not null default 'v1',
  source_page        text,
  assigned_to        uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint enquiries_contact_required check (email is not null or phone is not null),
  constraint enquiries_payload_object check (jsonb_typeof(payload) = 'object')
);
create index enquiries_inbox_idx on public.enquiries (enquiry_type, status, created_at desc);
create index enquiries_assigned_idx on public.enquiries (assigned_to) where assigned_to is not null;
create index enquiries_email_recent_idx on public.enquiries (lower(email), created_at desc);

create table public.enquiry_notes (
  id         uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null default auth.uid(),
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at);

create trigger enquiries_set_updated_at before update on public.enquiries for each row execute function private.set_updated_at();
select private.enable_audit('public.enquiries');
select private.enable_audit('public.enquiry_notes');

alter table public.enquiries     enable row level security;
alter table public.enquiry_notes enable row level security;

-- No direct public INSERT: visitors submit through public.submit_enquiry() below.
create policy "enquiries: staff read" on public.enquiries
  for select to authenticated using (public.has_permission('enquiries.view'));
create policy "enquiries: staff edit" on public.enquiries
  for update to authenticated
  using (public.has_permission('enquiries.edit'))
  with check (public.has_permission('enquiries.edit'));
create policy "enquiries: staff delete" on public.enquiries
  for delete to authenticated using (public.has_permission('enquiries.delete'));

create policy "enquiry_notes: staff read" on public.enquiry_notes
  for select to authenticated using (public.has_permission('enquiries.view'));
create policy "enquiry_notes: staff add" on public.enquiry_notes
  for insert to authenticated
  with check (public.has_permission('enquiries.edit') and author_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Public form submission.
-- Validates input, ignores bot submissions (honeypot), and limits repeat
-- submissions from the same email address.
-- -----------------------------------------------------------------------------
create function public.submit_enquiry(
  enquiry_type  public.enquiry_type,
  full_name     text,
  consent_given boolean,
  email         text default null,
  phone         text default null,
  country       text default null,
  subject       text default null,
  message       text default null,
  payload       jsonb default '{}'::jsonb,
  source_page   text default null,
  website       text default null   -- honeypot: real visitors never fill this hidden field
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id     uuid;
  clean_mail text := nullif(lower(trim(email)), '');
  clean_tel  text := nullif(trim(phone), '');
begin
  -- Bots fill hidden fields: pretend success, store nothing.
  if nullif(trim(website), '') is not null then
    return gen_random_uuid();
  end if;

  if consent_given is not true then
    raise exception 'Consent is required' using errcode = '22023';
  end if;
  if nullif(trim(full_name), '') is null then
    raise exception 'Name is required' using errcode = '22023';
  end if;
  if clean_mail is null and clean_tel is null then
    raise exception 'An email address or phone number is required' using errcode = '22023';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' or pg_column_size(payload) > 20000 then
    raise exception 'Invalid form data' using errcode = '22023';
  end if;

  -- At most 5 submissions per email address per hour.
  if clean_mail is not null and (
    select count(*) from public.enquiries e
    where lower(e.email) = clean_mail and e.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many submissions. Please try again later.' using errcode = '54000';
  end if;

  insert into public.enquiries (
    enquiry_type, full_name, email, phone, country, subject, message,
    payload, consent_given, source_page
  ) values (
    submit_enquiry.enquiry_type, trim(full_name), clean_mail, clean_tel, nullif(trim(country), ''),
    nullif(trim(subject), ''), nullif(trim(message), ''),
    submit_enquiry.payload, true, nullif(trim(source_page), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;
comment on function public.submit_enquiry is
  'Public entry point for all website forms. Returns the new enquiry id.';

revoke all on function public.submit_enquiry from public;
grant execute on function public.submit_enquiry to anon, authenticated;
