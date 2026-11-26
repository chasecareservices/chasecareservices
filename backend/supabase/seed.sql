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
      ('carer@chasecare.local',    'Ama Mensah (demo carer)',  'worker'),
      ('carer2@chasecare.local',   'Kwame Owusu (demo carer)', 'worker')
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
