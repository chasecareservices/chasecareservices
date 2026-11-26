-- =============================================================================
-- 1. How each team photo is framed in the round picture on the About page.
-- 2. News & blog subscribers (double opt-in) and a record of what was sent.
--
-- Visitors never touch the subscriber table directly: the website server signs
-- them up and emails a confirmation link, so nobody can be subscribed without
-- clicking that link themselves. Staff with communications.* manage the list.
-- =============================================================================

-- ---------- 1. Team photo framing ----------
alter table public.team_members
  add column photo_crop text not null default 'close'
    check (photo_crop in ('close', 'upper', 'full'));
comment on column public.team_members.photo_crop is
  'close = head-and-shoulders photo, shown as it is; upper = half-length, zoom a little on the face; full = full-length, zoom in on the face.';

-- ---------- 2. Subscribers ----------
create table public.newsletter_subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  full_name        text check (char_length(full_name) <= 120),
  status           text not null default 'pending' check (status in ('pending', 'subscribed', 'unsubscribed')),
  token            uuid not null unique default gen_random_uuid(), -- in confirm and unsubscribe links
  source_page      text check (char_length(source_page) <= 300),
  consent_at       timestamptz not null default now(),
  confirm_sent_at  timestamptz,
  confirmed_at     timestamptz,
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.newsletter_subscribers is 'People who asked to get new articles by email. Only "subscribed" (confirmed) addresses are emailed.';
create index newsletter_subscribers_status_idx on public.newsletter_subscribers (status);

create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function private.set_updated_at();

-- Each article is emailed to subscribers at most once.
create table public.newsletter_sends (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null unique references public.posts (id) on delete cascade,
  sent_by     uuid references auth.users (id) on delete set null,
  recipients  integer not null default 0,
  failed      integer not null default 0,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);
comment on table public.newsletter_sends is 'Which articles were emailed to subscribers, when, by whom and to how many.';

alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_sends enable row level security;

create policy "newsletter_subscribers: staff read" on public.newsletter_subscribers
  for select to authenticated using (public.has_permission('communications.view'));
create policy "newsletter_subscribers: staff edit" on public.newsletter_subscribers
  for update to authenticated
  using (public.has_permission('communications.edit'))
  with check (public.has_permission('communications.edit'));
create policy "newsletter_subscribers: staff remove" on public.newsletter_subscribers
  for delete to authenticated using (public.has_permission('communications.delete'));

create policy "newsletter_sends: staff read" on public.newsletter_sends
  for select to authenticated using (public.has_permission('communications.view') or public.has_permission('blog.view'));
create policy "newsletter_sends: staff send" on public.newsletter_sends
  for insert to authenticated
  with check (public.has_permission('communications.edit') and sent_by = (select auth.uid()));
create policy "newsletter_sends: staff finish" on public.newsletter_sends
  for update to authenticated
  using (public.has_permission('communications.edit'))
  with check (public.has_permission('communications.edit'));

revoke all on public.newsletter_subscribers, public.newsletter_sends from anon;
grant select, update, delete on public.newsletter_subscribers to authenticated;
grant select, insert, update on public.newsletter_sends to authenticated;
revoke truncate, references, trigger on public.newsletter_subscribers, public.newsletter_sends from authenticated;
grant all on public.newsletter_subscribers, public.newsletter_sends to service_role;

-- Counts for the dashboard.
create function public.newsletter_counts()
returns table (subscribed bigint, pending bigint, unsubscribed bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) filter (where status = 'subscribed'),
         count(*) filter (where status = 'pending'),
         count(*) filter (where status = 'unsubscribed')
  from public.newsletter_subscribers;
$$;
revoke all on function public.newsletter_counts() from public, anon;
grant execute on function public.newsletter_counts() to authenticated;

select private.enable_audit('public.newsletter_subscribers');
