-- =============================================================================
-- LOCAL DEVELOPMENT SEED — runs on `supabase db reset` only.
-- Never run this against the live (production) project: it creates demo
-- accounts with known passwords and switches off the staff two-factor rule.
-- =============================================================================

-- Local convenience: allow staff permissions without two-factor sign-in.
update private.security_settings set require_staff_mfa = false;

update public.site_settings set
  phone = '+233 00 000 0000',
  whatsapp_number = '+233 00 000 0000',
  email = 'info@chasecareservices.org',
  address = 'Accra, Ghana',
  opening_hours = '[{"days": "Monday – Friday", "hours": "08:00 – 17:00"}, {"days": "Saturday", "hours": "09:00 – 13:00"}]'::jsonb;

-- Demo accounts. Password for all of them: ChaseCare2026!
do $$
declare
  demo record;
  uid uuid;
begin
  for demo in
    select * from (values
      ('owner@chasecare.local',    'Demo Owner',              'super_admin'),
      ('editor@chasecare.local',   'Demo Content Editor',     'content_editor'),
      ('ops@chasecare.local',      'Demo Operations Manager', 'operations_manager'),
      ('training@chasecare.local', 'Demo Training Coordinator', 'training_coordinator'),
      ('wellbeing@chasecare.local', 'Demo Wellbeing Officer',  'wellbeing_officer'),
      ('carer@chasecare.local',    'Ama Mensah (demo carer)',  'worker'),
      ('carer2@chasecare.local',   'Kwame Owusu (demo carer)', 'worker'),
      ('family@chasecare.local',   'Efua Boateng (demo family)', 'client')
    ) as t(email, full_name, role_key)
  loop
    uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', demo.email,
      extensions.crypt('ChaseCare2026!', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', demo.full_name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), uid, uid::text, 'email',
      jsonb_build_object('sub', uid::text, 'email', demo.email, 'email_verified', true),
      now(), now(), now()
    );

    insert into public.user_roles (user_id, role_key) values (uid, demo.role_key);
  end loop;
end;
$$;

-- A sample published blog post and a sample enquiry so the dashboard is not empty.
insert into public.posts (slug, title, excerpt, category_id, author_name, status, published_at, body)
select 'welcome-to-the-chasecare-journal', 'Welcome to the ChaseCare Journal',
       'Practical guidance on care, wellbeing and community from the Chase Care Services team.',
       c.id, 'Chase Care Services', 'published', now(),
       '[{"type": "paragraph", "data": {"text": "Sample post for local development."}}]'::jsonb
from public.post_categories c where c.slug = 'community';

select public.submit_enquiry(
  enquiry_type  => 'contact',
  full_name     => 'Ama Mensah',
  consent_given => true,
  email         => 'ama.mensah@example.com',
  country       => 'United Kingdom',
  subject       => 'Care for my mother in Kumasi',
  message       => 'Sample enquiry for local development.',
  source_page   => '/contact'
);

-- DEMO ONLY (local): sample impact numbers and recognition so the About page and
-- homepage sections can be previewed. These are NOT real Chase Care figures.
update public.site_settings set
  impact_stats = '[
    {"value": "000+", "label": "Demo: families supported", "detail": "replace with real figure"},
    {"value": "00", "label": "Demo: caregivers trained", "detail": "replace with real figure"},
    {"value": "0", "label": "Demo: regions served", "detail": "replace with real figure"}
  ]'::jsonb,
  recognitions = '[
    {"name": "Demo accreditation", "detail": "Replace with a real accreditation or membership", "year": "2026"}
  ]'::jsonb;

-- Demo care clients and assignments for the care worker portal (local only).
insert into public.care_clients (id, full_name, preferred_name, area, care_summary, emergency_contact_name, emergency_contact_phone) values
  ('00000000-0000-4000-8000-00000000c001', 'Akosua Boateng', 'Auntie Akosua', 'Spintex Road', 'Recovering from a stroke (left side weakness). Walks with a frame. Diabetic: check meals.', 'Yaw Boateng (son, in London)', '+44 7700 900123'),
  ('00000000-0000-4000-8000-00000000c002', 'Kofi Asante', 'Kofi', 'Weija', 'Autistic, 12 years old. Likes routine and drawing. After-school support.', 'Esi Asante (mother)', '+233 24 000 0002'),
  ('00000000-0000-4000-8000-00000000c003', 'Grace Adjei', 'Mama Grace', 'McCarthy Hill', 'Early-stage dementia. Companionship and meals.', 'Daniel Adjei (son)', '+233 20 000 0003')
on conflict (id) do nothing;

-- Approximate demo home locations (Mama Grace's is left unset to show that case).
update public.care_clients set home_lat = 5.6362, home_lng = -0.1110 where id = '00000000-0000-4000-8000-00000000c001'; -- Spintex Road
update public.care_clients set home_lat = 5.5583, home_lng = -0.3358 where id = '00000000-0000-4000-8000-00000000c002'; -- Weija

insert into public.care_assignments (client_id, worker_id)
select c.id, u.id
from (values
  ('00000000-0000-4000-8000-00000000c001'::uuid, 'carer@chasecare.local'),
  ('00000000-0000-4000-8000-00000000c002'::uuid, 'carer@chasecare.local'),
  ('00000000-0000-4000-8000-00000000c003'::uuid, 'carer2@chasecare.local')
) as v(client, email)
join public.care_clients c on c.id = v.client
join auth.users u on u.email = v.email
on conflict do nothing;

-- Demo care plans (local only).
insert into public.care_plans (client_id, about_me, goals, visit_tasks, risks, medication_notes, review_date) values
  ('00000000-0000-4000-8000-00000000c001',
   'Retired teacher. Loves gospel music and talking about her grandchildren in London. Prefers to be called Auntie Akosua.',
   array['Walk to the gate and back every day', 'Keep blood sugar steady'],
   array['Help with washing and dressing', 'Prepare a low-sugar lunch', 'Prompt 1 pm medication', 'Walking exercises with the frame (10 minutes)', 'Check skin on heels for redness'],
   'Left-side weakness after stroke: walk on her left side. Risk of falls on the veranda step. Diabetic: no sugary drinks.',
   'Metformin with lunch. Blood pressure tablet in the morning (given by her niece).',
   current_date + 60),
  ('00000000-0000-4000-8000-00000000c002',
   'Kofi is 12 and autistic. Loves drawing buses. Likes a visual timetable and a quiet room after school.',
   array['Finish homework three times a week', 'Practise asking for help with words'],
   array['Meet at the school gate at 3 pm', 'Snack and quiet time (15 minutes)', 'Homework with picture timetable', 'Drawing or outdoor play'],
   'Loud places upset him: give a 5-minute warning before any change. Never touch his drawings without asking.',
   null,
   current_date - 3)
on conflict (client_id) do nothing;

-- Demo visits (local only): yesterday (one done, one missed), today and the coming days.
insert into public.care_shifts (client_id, worker_id, shift_date, start_time, end_time, notes)
select v.client::uuid, u.id, current_date + v.day_offset, v.st::time, v.en::time, v.notes
from (values
  ('00000000-0000-4000-8000-00000000c001', 'carer@chasecare.local', -1, '09:00', '13:00', null),
  ('00000000-0000-4000-8000-00000000c002', 'carer@chasecare.local', -1, '15:00', '18:00', 'After school'),
  ('00000000-0000-4000-8000-00000000c001', 'carer@chasecare.local',  0, '09:00', '13:00', null),
  ('00000000-0000-4000-8000-00000000c002', 'carer@chasecare.local',  0, '15:00', '18:00', 'After school'),
  ('00000000-0000-4000-8000-00000000c001', 'carer@chasecare.local',  1, '09:00', '13:00', null),
  ('00000000-0000-4000-8000-00000000c003', 'carer2@chasecare.local', 0, '08:00', '11:00', null)
) as v(client, email, day_offset, st, en, notes)
join auth.users u on u.email = v.email;

-- Yesterday's morning visit with Auntie Akosua was reported; the afternoon one with Kofi was missed.
insert into public.care_reports (client_id, worker_id, visit_date, start_time, end_time, mood, summary, location_status)
select '00000000-0000-4000-8000-00000000c001', u.id, current_date - 1, '09:00', '13:00', 'good', 'Lunch, walking exercises and a long chat about her grandchildren.', 'not_recorded'
from auth.users u where u.email = 'carer@chasecare.local';

-- A demo incident (local only), still open, so the office has something to follow up.
insert into public.care_incidents (client_id, reported_by, occurred_at, place, kind, severity, what_happened, action_taken, people_told)
select '00000000-0000-4000-8000-00000000c001', u.id, now() - interval '20 hours', 'Bathroom', 'fall', 'moderate',
       'Auntie Akosua slipped on the wet bathroom step while I was fetching a towel. She bumped her left knee. No bleeding.',
       'Helped her sit on the chair, checked her knee, cold compress for 15 minutes. She could walk afterwards.',
       array['family']
from auth.users u where u.email = 'carer@chasecare.local';

-- Family portal (local only): Efua follows her mother, Auntie Akosua. The office has read yesterday's report.
insert into public.care_family_links (client_id, user_id, relationship)
select '00000000-0000-4000-8000-00000000c001', u.id, 'Daughter' from auth.users u where u.email = 'family@chasecare.local';
alter table public.care_reports disable trigger care_reports_guard; -- demo data only: no signed-in office user here
update public.care_reports set status = 'reviewed', reviewed_at = now(), office_note = 'Thanks Ama, lovely report.'
where client_id = '00000000-0000-4000-8000-00000000c001' and visit_date = current_date - 1;
alter table public.care_reports enable trigger care_reports_guard;

-- Recruitment pipeline (local only): one new website application, plus applicants at different stages.
insert into public.enquiries (enquiry_type, full_name, email, phone, message, payload, consent_given)
values ('worker_application', 'Abena Owusu', 'abena.owusu@example.com', '+233 24 555 0101',
        'I cared for my grandmother for three years and would love to do this work professionally.',
        '{"role": "Caregiver", "location": "Kumasi, Ashanti", "travel_areas": "Kumasi and Ejisu", "availability": ["Full-time", "Weekends"], "experience_years": "1–3 years", "languages": ["Twi", "English"], "has_ghana_card": "Yes", "checks_consent": true}'::jsonb,
        true);
insert into public.recruitment_applicants (id, full_name, email, phone, role_applied, location, availability, stage) values
  ('00000000-0000-4000-8000-0000000ea001', 'Kwame Asante', 'kwame.asante@example.com', '+233 20 555 0102', 'Nurse', 'Accra, East Legon', 'Full-time', 'screening'),
  ('00000000-0000-4000-8000-0000000ea002', 'Esi Mensah', 'esi.mensah@example.com', '+233 27 555 0103', 'Healthcare assistant', 'Tema', 'Part-time, Nights', 'training'),
  ('00000000-0000-4000-8000-0000000ea003', 'Yaw Boateng', null, '+233 55 555 0104', 'Caregiver', 'Cape Coast', 'Live-in', 'registered');
insert into public.recruitment_checks (applicant_id, check_key, status) values
  ('00000000-0000-4000-8000-0000000ea001', 'interview', 'passed'),
  ('00000000-0000-4000-8000-0000000ea001', 'id_verified', 'passed'),
  ('00000000-0000-4000-8000-0000000ea002', 'interview', 'passed'),
  ('00000000-0000-4000-8000-0000000ea002', 'id_verified', 'passed'),
  ('00000000-0000-4000-8000-0000000ea002', 'references', 'passed'),
  ('00000000-0000-4000-8000-0000000ea002', 'background_check', 'passed'),
  ('00000000-0000-4000-8000-0000000ea002', 'safeguarding_training', 'passed'),
  ('00000000-0000-4000-8000-0000000ea002', 'comp_practical', 'passed'),
  ('00000000-0000-4000-8000-0000000ea002', 'comp_communication', 'passed');

-- Wellbeing Hub (local only): example services, resources and one request from Ama.
insert into public.wellbeing_services (name, kind, provider, description, benefit, how_to_access, location, audience, status, sort_order) values
  ('Confidential counselling', 'counselling', 'Chase Care wellbeing team', 'Talk to someone in confidence about stress, grief, burnout or anything on your mind. We arrange sessions with a qualified counsellor.', 'Free for ChaseCare care workers', 'Ask through the Wellbeing Hub in your portal.', 'In person or by phone', 'public', 'published', 10),
  ('Health check referral', 'health', 'Demo partner clinic', 'A general health check, blood pressure and advice from a nurse.', null, 'Ask through the Wellbeing Hub and we will book you in.', 'Accra', 'workers', 'published', 20),
  ('Laboratory tests', 'laboratory', 'Demo partner laboratory', 'Routine tests such as full blood count, malaria, hepatitis B and typhoid, when your role or your doctor needs them.', 'Discounted for ChaseCare workers', 'Ask through the Wellbeing Hub for a referral letter.', 'Accra and Kumasi', 'workers', 'published', 30),
  ('Worker insurance', 'insurance', 'Chase Care Services', 'What our cover includes while you are working, and how to make a claim.', null, 'Ask the wellbeing team for the policy summary.', null, 'workers', 'published', 40);
insert into public.wellbeing_resources (title, kind, summary, url, starts_at, place, audience, status) values
  ('Looking after yourself as a carer', 'article', 'Simple daily habits that protect your energy, sleep and mood.', null, null, null, 'public', 'published'),
  ('Coping with stress and burnout', 'webinar', 'An hour with a counsellor: spotting burnout early and what helps.', null, date_trunc('day', now()) + interval '8 days 16 hours', 'Online (link sent the day before)', 'workers', 'published'),
  ('Monthly carers'' support circle', 'support_session', 'A relaxed, confidential space to share and be heard.', null, date_trunc('day', now()) + interval '15 days 17 hours', 'Chase Care office, Accra', 'workers', 'published');
insert into public.wellbeing_requests (worker_id, kind, urgency, contact_method, contact_times, message)
select u.id, 'counselling', 'soon', 'whatsapp', 'Weekday evenings', 'I have been finding it hard to sleep since one of my clients passed away last month.'
from auth.users u where u.email = 'carer@chasecare.local';
