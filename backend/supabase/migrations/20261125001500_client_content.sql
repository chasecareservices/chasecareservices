-- =============================================================================
-- Content from the client's own documents (Chase Care introduction letter,
-- SEN schools partnership proposal and the "Better Care. Better Lives." flyer).
-- Data only; safe to run more than once.
-- =============================================================================

-- ---------- Contact details (only replaces the original placeholders) ----------
update public.site_settings set
  phone = '+233 55 281 5719',
  whatsapp_number = '+233 55 281 5719',
  email = 'chasecareinfo@gmail.com',
  address = 'Weija (Accra) · Spintex Road · McCarthy Hill',
  tagline = 'Better Care. Better Lives.'
where id = true and (phone is null or phone = '' or phone = '+233 00 000 0000');

-- ---------- Care services ----------
insert into public.services (slug, service_group, name, summary, description, includes, audience, cta_label, status, sort_order) values
(
  'patient-home-care', 'care', 'Professional Patient Home Care',
  'Professional nursing and home care for patients who need ongoing or specialised support at home.',
  E'We provide professional nursing and home care support for patients who require ongoing or specialised assistance at home.\n\nOur services are intended for individuals recovering from or living with conditions such as stroke (CVA), as well as patients with other medical conditions or complex care needs.\n\nOur aim is to support comfort, safety, dignity and continuity of care in the comfort and familiarity of the patient''s own home.',
  array['Nursing and home care support', 'Stroke (CVA) recovery support', 'Support for complex care needs', 'Initial assessment and individual care plan', 'Risk assessment and care documentation', 'Regular review of care'],
  'Patients recovering from or living with stroke and other medical conditions or complex care needs, and their families.',
  'Request this service', 'published', 5
),
(
  'companionship', 'care', 'Companionship & Personal Support',
  'Companionship and practical day-to-day help for people who would benefit from company and encouragement.',
  E'We provide companionship and practical day-to-day assistance for individuals who may benefit from social interaction, encouragement and support with everyday activities.\n\nSupport is planned around the person''s routines, interests and preferences.',
  array['Companionship and conversation', 'Encouragement and social interaction', 'Help with everyday activities', 'Accompanying to appointments and outings'],
  'Older people and anyone who would benefit from company and practical support.',
  'Request this service', 'published', 45
)
on conflict (slug) do nothing;

update public.services set
  name = 'Nanny & Childcare',
  summary = 'Dependable nanny and childcare support for children''s daily routines, supervision, personal care and wellbeing.',
  description = E'We offer dependable nanny and childcare support to help families with children''s daily routines, supervision, personal care and general well-being.\n\nOur nannies receive training in childcare, first aid and safeguarding before placement.',
  includes = array['Daily routines and supervision', 'Personal care', 'General well-being', 'House help and childcare', 'Flexible arrangements']
where slug = 'nanny-services' and name = 'Nanny Services';

update public.services set
  summary = 'Support for children and adults with autism, developmental conditions and other disabilities, planned around each person.',
  description = E'We support children and individuals with autism, developmental conditions and other disabilities who may require additional assistance, supervision and personalised care at home.\n\nSupport is planned around the person''s needs, abilities, routines and family preferences.'
where slug = 'disability-support' and description is null;

update public.services set
  name = 'Special Needs Support for Schools & Families',
  summary = 'Trained carers for children with special educational needs — after school, at weekends, in the holidays and, where agreed, at school.',
  description = E'We work with schools and families that need additional support for children with special educational needs.\n\nOur professionals can provide care and support outside school hours — after school, at weekends, during school breaks and in the holidays — subject to an agreed care arrangement and availability. Where the school agrees, the same carer can also support the young person during the school day, giving continuity between school, home and the community.\n\nOur preferred arrangements are full-time live-in or live-out care, which allow consistent routines and strong professional relationships.',
  includes = array['Full-time live-in care and support', 'Full-time live-out care and support', 'After-school and one-to-one support', 'Weekend and holiday support', 'School-based support, where the school agrees', 'Support with transitions between school, home and community'],
  audience = 'Children and young people with special educational needs, learning disabilities or autism, their families and their schools.'
where slug = 'school-support' and name = 'School Support';

-- ---------- Courses advertised on the flyer ----------
insert into public.courses (slug, title, category, audience, summary, is_signature, sort_order) values
  ('manual-handling', 'Manual Handling', 'Safety', 'caregivers', 'Safe moving, positioning and transfer techniques that protect the person you support and yourself.', false, 45),
  ('special-educational-needs', 'SEN (Special Educational Needs)', 'Specialist care', 'caregivers', 'Understanding and supporting children and young people with special educational needs at home, in school and in the community.', false, 65),
  ('house-help-and-childcare', 'House Help & Childcare', 'Core', 'caregivers', 'Professional skills for house help and childcare roles: routines, supervision, hygiene, safety and working with families.', false, 75),
  ('special-needs-support', 'Special Needs Support', 'Specialist care', 'caregivers', 'Person-centred support for people with disabilities and additional needs, including communication, routines and independence.', false, 76)
on conflict (slug) do nothing;

update public.courses set summary = 'Emergency first aid skills for caregivers, nannies and families.' where slug = 'first-aid' and summary is null;
update public.courses set summary = 'Health and social care training at Levels 1, 2 and 3, building the knowledge and confidence for a career in care.' where slug = 'health-and-social-care' and summary is null;
update public.courses set summary = 'Keeping people safe at home and at work: risk awareness, infection control and safe working practices.' where slug = 'health-and-safety' and summary is null;
update public.courses set summary = 'Understanding dementia and providing compassionate, person-centred support to people living with it.' where slug = 'dementia-care' and summary is null;

update public.courses set status = 'published'
where status = 'draft'
  and slug in ('first-aid', 'manual-handling', 'health-and-social-care', 'health-and-safety', 'dementia-care',
               'special-educational-needs', 'house-help-and-childcare', 'special-needs-support');

-- ---------- Menu: About Us → How We Care; Care Services → new services ----------
insert into public.navigation_items (menu, parent_id, label, href, sort_order)
select 'main', p.id, v.label, v.href, v.sort_order
from (values
  ('/about', 'How We Care', '/about/how-we-care', 15),
  ('/care-services', 'Patient Home Care', '/care-services/patient-home-care', 8),
  ('/care-services', 'Companionship & Personal Support', '/care-services/companionship', 45)
) as v(parent_href, label, href, sort_order)
join public.navigation_items p on p.menu = 'main' and p.parent_id is null and p.href = v.parent_href
where not exists (select 1 from public.navigation_items n where n.menu = 'main' and n.href = v.href);

update public.navigation_items set label = 'Nanny & Childcare' where menu = 'main' and href = '/care-services/nanny-services' and label = 'Nanny Services';
update public.navigation_items set label = 'Special Needs & School Support' where menu = 'main' and href = '/care-services/school-support' and label = 'School Support';
