-- =============================================================================
-- Initial website content taken from the client proposal
-- (doc/client-specification/ChaseCareServices_Website_Proposal.md).
-- Everything here can be edited from the admin dashboard.
--   • Services and blog categories are published (they come straight from the proposal).
--   • Pages, courses and products start as drafts: the owner must add details
--     (copy, prices, certification type) before they go live.
-- =============================================================================

update public.site_settings set
  supporting_statement = 'Person-centred care, professional support and training for individuals, families and communities in Ghana and across the diaspora.',
  default_seo = jsonb_build_object(
    'title', 'Chase Care Services — Quality Care. Compassionate Support. Empowered Lives.',
    'description', 'Professional, person-centred care and support for individuals and families in Ghana and across the diaspora.'
  );

-- -----------------------------------------------------------------------------
-- Services [§8, §9, §10, §21, §33]
-- -----------------------------------------------------------------------------
insert into public.services (slug, service_group, name, summary, includes, sort_order, status) values
  ('elderly-care', 'care', 'Elderly Care',
   'Personal, compassionate support for older people at home and in the community.',
   array['Personal care', 'Companionship', 'Medication support', 'Meal support', 'Mobility assistance',
         'Household support', 'Community activities', 'Hospital appointments', 'Overnight care',
         'Live-in care where appropriate'], 10, 'published'),
  ('disability-support', 'care', 'Disability Support',
   'Support for daily living, independence and community participation.',
   array['Daily living support', 'Community participation', 'Social activities', 'Supported volunteering',
         'Personal care', 'Respite', 'Family support', 'Skills development', 'Support for young adults'], 20, 'published'),
  ('autism-support', 'care', 'Autism Support',
   'Person-centred support for autistic children, young people, adults and their families.',
   array['Daily living support', 'Community participation', 'Social activities', 'Family support',
         'Skills development', 'Respite', 'Support for young adults'], 30, 'published'),
  ('home-care', 'care', 'Home Care',
   'Trusted care and support in the comfort of your own home.',
   array['Personal care', 'Household support', 'Companionship', 'Medication support', 'Meal support'], 40, 'published'),
  ('community-support', 'care', 'Community Support',
   'Helping individuals, including young adults with additional needs, build confidence and independence.',
   array['Supported volunteering', 'Shopping', 'Recreation', 'Appointments', 'Social activities', 'Skills development'], 50, 'published'),
  ('weekend-care', 'care', 'Weekend Care',
   'Flexible weekend support for individuals and families.',
   array['Personal care', 'Companionship', 'Community activities', 'Family support'], 60, 'published'),
  ('nanny-services', 'care', 'Nanny Services',
   'Professional, trained nannies for families.',
   array['Professional nanny services', 'Family support', 'Flexible service requests'], 70, 'published'),
  ('housekeeping', 'care', 'Housekeeping',
   'Reliable household support for individuals and families.',
   array['Household support', 'Family support', 'Flexible service requests'], 80, 'published'),
  ('therapy-and-professionals', 'care', 'Therapy & Professional Services',
   'A Professional Care Network of therapists, nurses, counsellors and special educational needs professionals.',
   array['Therapists', 'Nurses', 'Healthcare professionals', 'Special educational needs professionals', 'Counsellors'], 90, 'published'),
  ('school-support', 'care', 'School Support',
   'Working with schools to support learners with additional needs.',
   array['Individual support', 'Special educational needs', 'Disability support', 'Care assistance',
         'Training', 'Parent support', 'Specialist referrals'], 100, 'published'),
  ('hospital-support', 'care', 'Hospital Support',
   'Working with hospitals on discharge, home-care arrangements and follow-up.',
   array['Discharge support', 'Home-care arrangements', 'Post-hospital support', 'Family support',
         'Caregiver placement', 'Community follow-up'], 110, 'published'),

  ('care-for-loved-ones-in-ghana', 'diaspora', 'Care for Loved Ones in Ghana',
   'Your loved one may be in Ghana while you are thousands of miles away. We help you stay connected to their care.',
   array['Parent and elderly care', 'Disability and autism support', 'Home support', 'Respite',
         'Hospital support', 'Welfare visits', 'Care coordination'], 10, 'published'),
  ('diaspora-elderly-care', 'diaspora', 'Elderly Care for Diaspora Families',
   'Trusted elderly care for parents and relatives in Ghana, arranged from anywhere in the world.',
   array['Personal care', 'Companionship', 'Hospital appointments', 'Regular updates to family'], 20, 'published'),
  ('diaspora-disability-support', 'diaspora', 'Disability Support for Diaspora Families',
   'Disability and autism support for loved ones in Ghana.',
   array['Daily living support', 'Community participation', 'Family support'], 30, 'published'),
  ('welfare-visits', 'diaspora', 'Welfare Visits',
   'Regular visits to check on the wellbeing of your loved one.',
   array['Wellbeing checks', 'Updates to family abroad'], 40, 'published'),
  ('care-coordination', 'diaspora', 'Care Coordination',
   'We coordinate care, appointments and support on your behalf.',
   array['Care planning', 'Appointment coordination', 'Regular communication'], 50, 'published'),

  ('family-respite', 'respite', 'Family Respite',
   'Planned respite for parents and carers who need time to rest, attend appointments, travel or recharge.',
   array['Planned short breaks', 'Trained, trusted carers'], 10, 'published'),
  ('young-people-respite', 'respite', 'Respite for Young People & Adults with Additional Needs',
   'Safe, supportive short stays in a structured environment while parents and carers take a break.',
   array['Short stays', 'Structured activities', 'Accessible environment'], 20, 'published'),
  ('respite-residence', 'respite', 'Respite Residence',
   'Our short-stay residence: facilities, location, accessibility and packages.',
   array['Accommodation information', 'Facilities', 'Accessibility information', 'Respite packages', 'Booking enquiry'], 30, 'published'),
  ('stay-with-us', 'respite', 'Stay With Us',
   'Short-stay accommodation: availability, booking information, house rules and accessibility.',
   array['Availability', 'Booking information', 'House rules', 'Accessibility details'], 40, 'draft');

-- -----------------------------------------------------------------------------
-- Blog categories [§24]
-- -----------------------------------------------------------------------------
insert into public.post_categories (slug, name, sort_order) values
  ('elderly-care', 'Elderly Care', 10),
  ('autism', 'Autism', 20),
  ('disability', 'Disability', 30),
  ('parenting', 'Parenting', 40),
  ('caregiver-support', 'Caregiver Support', 50),
  ('dementia', 'Dementia', 60),
  ('health-and-wellbeing', 'Health & Wellbeing', 70),
  ('community', 'Community', 80),
  ('training', 'Training', 90),
  ('diaspora-care', 'Diaspora Care', 100),
  ('young-people', 'Young People', 110),
  ('special-educational-needs', 'Special Educational Needs', 120);

-- -----------------------------------------------------------------------------
-- Courses [§14–§17] — drafts until the owner confirms fees, dates and certification type.
-- -----------------------------------------------------------------------------
insert into public.courses (slug, title, category, audience, summary, is_signature, sort_order) values
  ('care-beyond-care', 'Care Beyond Care', 'Signature', 'professionals',
   'Teaching healthcare professionals how to connect with the person behind the care need.', true, 10),
  ('dementia-care', 'Dementia Care', 'Specialist care', 'caregivers', null, false, 20),
  ('health-and-social-care', 'Health & Social Care', 'Core', 'caregivers', null, false, 30),
  ('first-aid', 'First Aid', 'Safety', 'general', null, false, 40),
  ('health-and-safety', 'Health & Safety', 'Safety', 'caregivers', null, false, 50),
  ('autism-awareness', 'Autism Awareness', 'Specialist care', 'caregivers', null, false, 60),
  ('disability-support', 'Disability Support', 'Specialist care', 'caregivers', null, false, 70),
  ('safeguarding', 'Safeguarding', 'Core', 'caregivers', null, false, 80),
  ('person-centred-care', 'Person-Centred Care', 'Core', 'caregivers', null, false, 90),
  ('communication-in-care', 'Communication in Care', 'Core', 'caregivers', null, false, 100),
  ('professional-boundaries', 'Professional Boundaries', 'Core', 'caregivers', null, false, 110),
  ('start-your-career-in-care', 'Start Your Career in Care (Student Programme)', 'Student programme', 'students',
   'Structured training for SHS graduates and young people entering the care profession.', false, 120),
  ('understanding-autism-for-parents', 'Understanding Autism (Parent & Family Learning)', 'Parent & family learning', 'parents', null, false, 130);

update public.courses set learning_outcomes = array[
  'Compassionate communication', 'Dignity', 'Empathy', 'Understanding the client', 'Emotional wellbeing',
  'Professional relationships', 'Person-centred practice', 'Communication with families',
  'Understanding individual preferences'
] where slug = 'care-beyond-care';

-- -----------------------------------------------------------------------------
-- Shop catalogue [§26] — drafts until prices and photos are added.
-- -----------------------------------------------------------------------------
insert into public.product_categories (slug, name, sort_order) values
  ('id-and-lanyards', 'ID Cards & Lanyards', 10),
  ('clothing', 'Clothing', 20),
  ('training-materials', 'Training Materials', 30),
  ('merchandise', 'Merchandise', 40);

insert into public.products (slug, name, category_id, sort_order)
select v.slug, v.name, c.id, v.sort_order
from (values
  ('care-id-card', 'Care ID Card', 'id-and-lanyards', 10),
  ('chasecare-lanyard', 'ChaseCare Lanyard', 'id-and-lanyards', 20),
  ('chasecare-t-shirt', 'ChaseCare T-shirt', 'clothing', 30),
  ('training-workbook', 'Training Workbook', 'training-materials', 40)
) as v(slug, name, category_slug, sort_order)
join public.product_categories c on c.slug = v.category_slug;

-- -----------------------------------------------------------------------------
-- Pages [§33] — drafts with placeholder blocks; editors fill in the copy.
-- -----------------------------------------------------------------------------
insert into public.pages (slug, title, summary, body) values
  ('home', 'Home', 'Quality Care. Compassionate Support. Empowered Lives.', jsonb_build_array(
    jsonb_build_object('type', 'hero', 'visible', true, 'data', jsonb_build_object(
      'heading', 'Quality Care. Compassionate Support. Empowered Lives.',
      'text', 'Professional, person-centred care and support for individuals and families in Ghana and across the diaspora.',
      'buttons', jsonb_build_array(
        jsonb_build_object('label', 'Find a Care Service', 'href', '/care-services'),
        jsonb_build_object('label', 'Join Our Team', 'href', '/join-our-team'),
        jsonb_build_object('label', 'Explore Our Training', 'href', '/academy')),
      'note', 'Supporting families in Ghana and families around the world who need trusted care for their loved ones in Ghana.')),
    jsonb_build_object('type', 'who_we_are', 'visible', true, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'what_we_do', 'visible', true, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'diaspora', 'visible', true, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'why_choose_us', 'visible', true, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'academy', 'visible', true, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'wellbeing', 'visible', true, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'forum', 'visible', true, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'testimonials', 'visible', false, 'data', '{}'::jsonb),
    jsonb_build_object('type', 'cta_band', 'visible', true, 'data', '{}'::jsonb)
  )),
  ('about', 'About Us', null, '[]'::jsonb),
  ('about/who-we-are', 'Who We Are', null, '[]'::jsonb),
  ('about/vision-and-mission', 'Vision & Mission', null, '[]'::jsonb),
  ('about/our-values', 'Our Values', null, '[]'::jsonb),
  ('diaspora', 'Care From Anywhere in the World', null, '[]'::jsonb),
  ('respite', 'Respite & Accommodation', null, '[]'::jsonb),
  ('schools-and-hospitals', 'Schools & Hospitals', null, '[]'::jsonb),
  ('academy/workforce-standards', 'Competency Training & Workforce Standards', 'No placement without appropriate preparation.', '[]'::jsonb),
  ('parent-and-family-learning', 'Parent & Family Learning Centre', null, '[]'::jsonb),
  ('wellbeing', 'ChaseCare Wellbeing Hub', null, '[]'::jsonb),
  ('join-our-team', 'Build Your Career in Care', null, '[]'::jsonb),
  ('community', 'Community & Partnerships', null, '[]'::jsonb),
  ('community/monthly-forum', 'Monthly ChaseCare Community Forum', 'Every third Thursday of the month.', '[]'::jsonb),
  ('contact', 'Contact Us', null, '[]'::jsonb),
  ('privacy-policy', 'Privacy Policy', null, '[]'::jsonb),
  ('terms-of-service', 'Terms of Service', null, '[]'::jsonb),
  ('cookie-policy', 'Cookie Policy', null, '[]'::jsonb);

-- -----------------------------------------------------------------------------
-- Navigation [§6, §39]
-- -----------------------------------------------------------------------------
insert into public.navigation_items (menu, label, href, sort_order) values
  ('main', 'Home', '/', 10),
  ('main', 'About Us', '/about', 20),
  ('main', 'Care Services', '/care-services', 30),
  ('main', 'Training Academy', '/academy', 40),
  ('main', 'Respite & Accommodation', '/respite', 50),
  ('main', 'Wellbeing Hub', '/wellbeing', 60),
  ('main', 'Join Our Team', '/join-our-team', 70),
  ('main', 'Client Registration', '/register/client', 80),
  ('main', 'Resources', '/journal', 90),
  ('main', 'Shop', '/shop', 100),
  ('main', 'Contact', '/contact', 110),
  ('cta', 'Find a Care Service', '/care-services', 10),
  ('cta', 'Arrange Care in Ghana', '/diaspora', 20),
  ('cta', 'Join Our Team', '/join-our-team', 30),
  ('cta', 'Register for Training', '/academy', 40),
  ('cta', 'Contact ChaseCare', '/contact', 50),
  ('footer', 'Privacy Policy', '/privacy-policy', 10),
  ('footer', 'Terms of Service', '/terms-of-service', 20),
  ('footer', 'Cookie Policy', '/cookie-policy', 30);
