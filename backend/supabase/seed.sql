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
      ('training@chasecare.local', 'Demo Training Coordinator', 'training_coordinator')
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
