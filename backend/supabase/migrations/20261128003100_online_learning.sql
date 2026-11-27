-- =============================================================================
-- ChaseCare Academy online learning [§14–§17]: lessons, progress, assessment,
-- certificates (auto-numbered, verifiable) and CPD hours.
--
--   courses (new columns)  online_enabled, self_enrol, pass_mark, cpd_hours
--   course_lessons         the lessons of an online course
--   course_quiz_questions  the end-of-course assessment (answers never sent to learners)
--   course_enrolments      who is learning what
--   lesson_progress        lessons each learner has finished
--   quiz_attempts          assessment results
--   certificates           issued automatically on completion, or by staff for
--                          in-person courses; anyone can verify one by its code
--
-- Learners are care workers (Worker role) and others given the Learner or
-- Healthcare Professional role. Staff with academy.* manage everything.
-- =============================================================================

-- ---------- Course settings for online delivery ----------
alter table public.courses
  add column online_enabled boolean not null default false,
  add column self_enrol     boolean not null default false,
  add column pass_mark      integer not null default 80 check (pass_mark between 1 and 100),
  add column cpd_hours      numeric(5, 1) check (cpd_hours is null or cpd_hours >= 0);
comment on column public.courses.online_enabled is 'The course has online lessons in the learner area.';
comment on column public.courses.self_enrol is 'Signed-in learners may enrol themselves (free courses only).';

-- Who may learn online.
create function public.is_learner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_has_role('learner') or public.current_user_has_role('worker') or public.current_user_has_role('professional');
$$;

-- ---------- Lessons ----------
create table public.course_lessons (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses (id) on delete cascade,
  section       text check (char_length(section) <= 120),     -- optional heading, e.g. "Module 1: Understanding dementia"
  title         text not null check (char_length(title) between 2 and 200),
  body          text check (char_length(body) <= 30000),      -- paragraphs separated by blank lines
  video_url     text check (video_url ~* '^https://' and char_length(video_url) <= 500),
  resource_url  text check (resource_url ~* '^https://' and char_length(resource_url) <= 500),
  resource_label text check (char_length(resource_label) <= 120),
  minutes       integer check (minutes is null or minutes between 1 and 600),
  sort_order    integer not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index course_lessons_course_idx on public.course_lessons (course_id, sort_order);
create trigger course_lessons_set_updated_at before update on public.course_lessons
  for each row execute function private.set_updated_at();

-- ---------- Assessment ----------
create table public.course_quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses (id) on delete cascade,
  question        text not null check (char_length(question) between 5 and 1000),
  options         text[] not null check (array_length(options, 1) between 2 and 6),
  correct_option  integer not null,                           -- 0-based index into options
  explanation     text check (char_length(explanation) <= 1000),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  check (correct_option >= 0 and correct_option < array_length(options, 1))
);
create index course_quiz_questions_course_idx on public.course_quiz_questions (course_id, sort_order);

-- ---------- Enrolments & progress ----------
create table public.course_enrolments (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'enrolled' check (status in ('enrolled', 'completed', 'withdrawn')),
  source        text not null default 'staff' check (source in ('staff', 'self')),
  enrolled_by   uuid references auth.users (id) on delete set null,
  enrolled_at   timestamptz not null default now(),
  completed_at  timestamptz,
  unique (course_id, user_id)
);
create index course_enrolments_user_idx on public.course_enrolments (user_id);

create table public.lesson_progress (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.course_lessons (id) on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  enrolment_id  uuid not null references public.course_enrolments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  score         integer not null,
  total         integer not null,
  passed        boolean not null,
  answers       integer[] not null,
  created_at    timestamptz not null default now()
);
create index quiz_attempts_enrolment_idx on public.quiz_attempts (enrolment_id, created_at desc);

-- ---------- Certificates ----------
create sequence public.certificate_number_seq;

create table public.certificates (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null unique default ('CCS-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' || lpad(nextval('public.certificate_number_seq')::text, 5, '0')),
  verify_code         text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  enrolment_id        uuid unique references public.course_enrolments (id) on delete set null,
  user_id             uuid references public.profiles (id) on delete set null,
  course_id           uuid references public.courses (id) on delete set null,
  learner_name        text not null check (char_length(learner_name) between 2 and 120),
  course_title        text not null check (char_length(course_title) between 2 and 200),
  certification_type  public.certification_type not null default 'internal',
  accrediting_body    text,
  cpd_hours           numeric(5, 1),
  completed_on        date not null default (now() at time zone 'UTC')::date,
  issued_at           timestamptz not null default now(),
  issued_by           uuid references auth.users (id) on delete set null,   -- null = issued automatically online
  revoked_at          timestamptz,
  revoked_reason      text check (char_length(revoked_reason) <= 300)
);
comment on table public.certificates is 'ChaseCare Academy certificates. Verify at /certificates/verify.';
create index certificates_user_idx on public.certificates (user_id);

-- Once issued, only revoking (and un-revoking) is allowed.
create function private.guard_certificate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.number <> old.number or new.verify_code <> old.verify_code or new.learner_name <> old.learner_name
     or new.course_title <> old.course_title or new.issued_at <> old.issued_at or new.completed_on <> old.completed_on
     or new.certification_type <> old.certification_type or new.cpd_hours is distinct from old.cpd_hours then
    raise exception 'A certificate cannot be changed once issued. Revoke it and issue a new one.' using errcode = '42501';
  end if;
  if new.revoked_at is not null and nullif(trim(new.revoked_reason), '') is null then
    raise exception 'Give a reason for revoking the certificate.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger certificates_guard before update on public.certificates
  for each row execute function private.guard_certificate();

-- Issues the certificate for a completed enrolment (once).
create function private.issue_certificate(enrolment uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e  public.course_enrolments;
  c  public.courses;
  nm text;
  n  text;
begin
  select number into n from public.certificates where enrolment_id = enrolment;
  if n is not null then return n; end if;
  select * into e from public.course_enrolments where id = enrolment;
  select * into c from public.courses where id = e.course_id;
  select coalesce(nullif(trim(full_name), ''), 'Learner') into nm from public.profiles where id = e.user_id;
  insert into public.certificates (enrolment_id, user_id, course_id, learner_name, course_title, certification_type, accrediting_body, cpd_hours)
  values (e.id, e.user_id, c.id, left(nm, 120), left(c.title, 200), c.certification_type,
          case when c.certification_type = 'externally_accredited' then c.accrediting_body end, c.cpd_hours)
  returning number into n;
  return n;
end;
$$;

-- ---------- What learners can do (all checked here) ----------
create function private.my_enrolment(course uuid)
returns public.course_enrolments
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.course_enrolments
  where course_id = course and user_id = (select auth.uid()) and status in ('enrolled', 'completed');
$$;

-- Finishes the course when every lesson is done and there is no assessment.
create function private.maybe_complete(enrolment uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.course_enrolments;
  remaining int;
  has_quiz boolean;
begin
  select * into e from public.course_enrolments where id = enrolment;
  if e.status = 'completed' then
    return (select number from public.certificates where enrolment_id = e.id);
  end if;
  select count(*) into remaining from public.course_lessons l
  where l.course_id = e.course_id and l.published
    and not exists (select 1 from public.lesson_progress p where p.lesson_id = l.id and p.user_id = e.user_id);
  select exists (select 1 from public.course_quiz_questions q where q.course_id = e.course_id) into has_quiz;
  if remaining = 0 and not has_quiz then
    update public.course_enrolments set status = 'completed', completed_at = now() where id = e.id;
    return private.issue_certificate(e.id);
  end if;
  return null;
end;
$$;

-- Marks a lesson finished. Returns the certificate number if that completed the course.
create function public.complete_lesson(lesson uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.course_lessons;
  e public.course_enrolments;
begin
  select * into l from public.course_lessons where id = lesson and published;
  if not found then raise exception 'Lesson not found' using errcode = 'P0002'; end if;
  e := private.my_enrolment(l.course_id);
  if e.id is null then raise exception 'You are not enrolled on this course' using errcode = '42501'; end if;
  insert into public.lesson_progress (user_id, lesson_id) values ((select auth.uid()), lesson) on conflict do nothing;
  return private.maybe_complete(e.id);
end;
$$;

-- The assessment questions, without the answers.
create function public.course_quiz(course uuid)
returns table (id uuid, question text, options text[], sort_order int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (private.my_enrolment(course)).id is null and not public.has_permission('academy.view') then
    raise exception 'You are not enrolled on this course' using errcode = '42501';
  end if;
  return query select q.id, q.question, q.options, q.sort_order from public.course_quiz_questions q
               where q.course_id = course order by q.sort_order, q.created_at;
end;
$$;

-- Marks the assessment. answers[i] is the chosen option for the i-th question (in course_quiz order).
create function public.submit_quiz(course uuid, answers integer[])
returns table (score int, total int, passed boolean, pass_mark int, certificate_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  e        public.course_enrolments;
  c        public.courses;
  correct  int[];
  s        int := 0;
  t        int;
  ok       boolean;
  cert     text;
begin
  e := private.my_enrolment(course);
  if e.id is null then raise exception 'You are not enrolled on this course' using errcode = '42501'; end if;
  if exists (
    select 1 from public.course_lessons l
    where l.course_id = course and l.published
      and not exists (select 1 from public.lesson_progress p where p.lesson_id = l.id and p.user_id = e.user_id)
  ) then
    raise exception 'Finish every lesson before the assessment' using errcode = '55000';
  end if;
  if (select count(*) from public.quiz_attempts a where a.enrolment_id = e.id and a.created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have tried 5 times today. Please review the lessons and try again tomorrow.' using errcode = '54000';
  end if;
  select * into c from public.courses where id = course;
  select array_agg(q.correct_option order by q.sort_order, q.created_at) into correct from public.course_quiz_questions q where q.course_id = course;
  t := coalesce(array_length(correct, 1), 0);
  if t = 0 then raise exception 'This course has no assessment' using errcode = 'P0002'; end if;
  if coalesce(array_length(answers, 1), 0) <> t then
    raise exception 'Please answer every question' using errcode = '22023';
  end if;
  for i in 1..t loop
    if answers[i] = correct[i] then s := s + 1; end if;
  end loop;
  ok := s * 100 >= c.pass_mark * t;
  insert into public.quiz_attempts (enrolment_id, user_id, score, total, passed, answers) values (e.id, e.user_id, s, t, ok, answers);
  if ok then
    update public.course_enrolments set status = 'completed', completed_at = coalesce(completed_at, now()) where id = e.id;
    cert := private.issue_certificate(e.id);
  end if;
  return query select s, t, ok, c.pass_mark, cert;
end;
$$;

-- A learner enrols themselves on a free, self-enrol online course.
create function public.self_enrol(course uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.courses;
  new_id uuid;
begin
  if not public.is_learner() then raise exception 'Learner accounts only' using errcode = '42501'; end if;
  select * into c from public.courses where id = course;
  if not found or c.status <> 'published' or not c.online_enabled or not c.self_enrol or coalesce(c.fee_amount, 0) > 0 then
    raise exception 'This course is not open for online enrolment' using errcode = '42501';
  end if;
  insert into public.course_enrolments (course_id, user_id, source) values (course, (select auth.uid()), 'self')
  on conflict (course_id, user_id) do update set status = case when public.course_enrolments.status = 'withdrawn' then 'enrolled' else public.course_enrolments.status end
  returning id into new_id;
  return new_id;
end;
$$;

-- The lesson list of a published online course, for the public course page.
create function public.course_outline(course uuid)
returns table (section text, title text, minutes int)
language sql
stable
security definer
set search_path = ''
as $$
  select l.section, l.title, l.minutes from public.course_lessons l
  join public.courses c on c.id = l.course_id
  where l.course_id = course and l.published and c.status = 'published' and c.online_enabled
  order by l.sort_order, l.created_at;
$$;

-- Anyone can check a certificate by its code (no personal details beyond what is printed on it).
create function public.verify_certificate(code text)
returns table (number text, learner_name text, course_title text, certification_type public.certification_type,
               accrediting_body text, cpd_hours numeric, completed_on date, revoked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.number, c.learner_name, c.course_title, c.certification_type, c.accrediting_body, c.cpd_hours, c.completed_on, c.revoked_at is not null
  from public.certificates c
  where c.verify_code = upper(trim(code)) or c.number = upper(trim(code));
$$;

-- ---------- Row Level Security ----------
alter table public.course_lessons enable row level security;
alter table public.course_quiz_questions enable row level security;
alter table public.course_enrolments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;

create policy "course_lessons: enrolled learners read" on public.course_lessons
  for select to authenticated
  using (published and exists (
    select 1 from public.course_enrolments e
    where e.course_id = course_lessons.course_id and e.user_id = (select auth.uid()) and e.status in ('enrolled', 'completed')
  ));
create policy "course_lessons: staff read" on public.course_lessons
  for select to authenticated using (public.has_permission('academy.view'));
create policy "course_lessons: add" on public.course_lessons
  for insert to authenticated with check (public.has_permission('academy.create'));
create policy "course_lessons: update" on public.course_lessons
  for update to authenticated using (public.has_permission('academy.edit')) with check (public.has_permission('academy.edit'));
create policy "course_lessons: delete" on public.course_lessons
  for delete to authenticated using (public.has_permission('academy.delete'));

create policy "course_quiz_questions: staff read" on public.course_quiz_questions
  for select to authenticated using (public.has_permission('academy.view'));
create policy "course_quiz_questions: manage" on public.course_quiz_questions
  for all to authenticated using (public.has_permission('academy.edit')) with check (public.has_permission('academy.edit'));

create policy "course_enrolments: read own" on public.course_enrolments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "course_enrolments: staff read" on public.course_enrolments
  for select to authenticated using (public.has_permission('academy.view'));
create policy "course_enrolments: staff add" on public.course_enrolments
  for insert to authenticated with check (public.has_permission('academy.create') and source = 'staff');
create policy "course_enrolments: staff update" on public.course_enrolments
  for update to authenticated using (public.has_permission('academy.edit')) with check (public.has_permission('academy.edit'));
create policy "course_enrolments: delete" on public.course_enrolments
  for delete to authenticated using (public.has_permission('academy.delete'));

create policy "lesson_progress: read own" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "lesson_progress: staff read" on public.lesson_progress
  for select to authenticated using (public.has_permission('academy.view'));

create policy "quiz_attempts: read own" on public.quiz_attempts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "quiz_attempts: staff read" on public.quiz_attempts
  for select to authenticated using (public.has_permission('academy.view'));

create policy "certificates: read own" on public.certificates
  for select to authenticated using (user_id = (select auth.uid()));
create policy "certificates: staff read" on public.certificates
  for select to authenticated using (public.has_permission('academy.view'));
create policy "certificates: staff issue" on public.certificates
  for insert to authenticated with check (public.has_permission('academy.create') and issued_by = (select auth.uid()));
create policy "certificates: staff revoke" on public.certificates
  for update to authenticated using (public.has_permission('academy.edit')) with check (public.has_permission('academy.edit'));

-- Learners' names on the Academy pages.
create policy "profiles: academy staff read learners" on public.profiles
  for select to authenticated
  using (public.has_permission('academy.view') and exists (select 1 from public.course_enrolments e where e.user_id = profiles.id));

-- ---------- Grants ----------
revoke all on public.course_lessons, public.course_quiz_questions, public.course_enrolments, public.lesson_progress,
  public.quiz_attempts, public.certificates from anon;
grant select, insert, update, delete on public.course_lessons, public.course_quiz_questions, public.course_enrolments to authenticated;
grant select on public.lesson_progress, public.quiz_attempts to authenticated;
grant select, insert, update on public.certificates to authenticated;
revoke truncate, references, trigger on public.course_lessons, public.course_quiz_questions, public.course_enrolments,
  public.lesson_progress, public.quiz_attempts, public.certificates from authenticated;
grant all on public.course_lessons, public.course_quiz_questions, public.course_enrolments, public.lesson_progress,
  public.quiz_attempts, public.certificates to service_role;
grant usage on sequence public.certificate_number_seq to authenticated, service_role;

revoke all on function public.is_learner(), public.complete_lesson(uuid), public.course_quiz(uuid), public.submit_quiz(uuid, integer[]),
  public.self_enrol(uuid), public.course_outline(uuid), public.verify_certificate(text) from public;
grant execute on function public.is_learner(), public.complete_lesson(uuid), public.course_quiz(uuid), public.submit_quiz(uuid, integer[]),
  public.self_enrol(uuid) to authenticated;
grant execute on function public.course_outline(uuid), public.verify_certificate(text) to anon, authenticated;
revoke all on function private.my_enrolment(uuid), private.maybe_complete(uuid), private.issue_certificate(uuid), private.guard_certificate() from public;

select private.enable_audit('public.course_lessons');
select private.enable_audit('public.course_quiz_questions');
select private.enable_audit('public.course_enrolments');
select private.enable_audit('public.certificates');

-- The website server (secret key only) looks up an existing account by email when enrolling someone.
create function public.find_user_id_by_email(lookup text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(trim(lookup)) limit 1;
$$;
revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
