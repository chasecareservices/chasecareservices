-- =============================================================================
-- Care plans: what each client needs, and what to do on every visit.
--
-- One current plan per client, written by the office (clients.edit) and read by
-- the care workers assigned to that client. Every change is kept in the audit
-- log. Care reports record which of the plan's visit tasks were done.
-- =============================================================================

-- Longest item in a list of short texts (for length checks on text arrays).
create function private.max_item_length(items text[])
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(char_length(x)), 0) from unnest(items) as x;
$$;

create table public.care_plans (
  client_id         uuid primary key references public.care_clients (id) on delete cascade,
  about_me          text check (char_length(about_me) <= 2000),          -- the person: likes, routines, what matters to them
  goals             text[] not null default '{}' check (cardinality(goals) <= 15),
  visit_tasks       text[] not null default '{}' check (cardinality(visit_tasks) <= 30),
  risks             text check (char_length(risks) <= 2000),             -- needs, risks and how to manage them
  medication_notes  text check (char_length(medication_notes) <= 2000),
  review_date       date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users (id) on delete set null,
  constraint care_plans_item_length check (private.max_item_length(visit_tasks) <= 200 and private.max_item_length(goals) <= 200)
);
comment on table public.care_plans is 'The current care plan for a client: goals, tasks for each visit, risks and medication notes.';

create trigger care_plans_set_updated_at
  before update on public.care_plans
  for each row execute function private.set_updated_at();

-- Which of the plan's visit tasks the worker did on this visit.
alter table public.care_reports
  add column tasks_done text[] not null default '{}'
    check (cardinality(tasks_done) <= 30 and private.max_item_length(tasks_done) <= 200);

alter table public.care_plans enable row level security;

create policy "care_plans: office read" on public.care_plans
  for select to authenticated using (public.has_permission('clients.view') or public.has_permission('care_ops.view'));
create policy "care_plans: assigned worker read" on public.care_plans
  for select to authenticated using (public.is_assigned_to(client_id));
create policy "care_plans: office write" on public.care_plans
  for all to authenticated
  using (public.has_permission('clients.edit'))
  with check (public.has_permission('clients.edit'));

revoke all on public.care_plans from anon;
grant select, insert, update on public.care_plans to authenticated;
revoke truncate, references, trigger on public.care_plans from authenticated;
grant all on public.care_plans to service_role;

select private.enable_audit('public.care_plans');
