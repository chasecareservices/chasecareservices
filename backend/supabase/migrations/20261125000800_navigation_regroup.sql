-- =============================================================================
-- Regroup the main navigation into 6 top-level sections with dropdowns
-- (agreed with the owner; replaces the 11-item top row from proposal §6).
-- The orange "Request Care" button in the header covers Client Registration,
-- and the logo links Home.
-- Rebuilds the main menu only (footer and CTA menus are untouched).
-- Safe to run more than once.
-- =============================================================================

delete from public.navigation_items where menu = 'main';

with parents (label, href, sort_order) as (
  values
    ('About Us', '/about', 10),
    ('Care Services', '/care-services', 20),
    ('Training Academy', '/academy', 30),
    ('Work With Us', '/join-our-team', 40),
    ('Community', '/community', 50),
    ('Contact', '/contact', 60)
)
insert into public.navigation_items (menu, label, href, sort_order)
select 'main', label, href, sort_order from parents;

with children (parent_href, label, href, sort_order) as (
  values
    ('/about', 'Who We Are', '/about#who-we-are', 10),
    ('/about', 'Vision & Mission', '/about#vision-and-mission', 20),
    ('/about', 'Our Values', '/about#our-values', 30),
    ('/about', 'Board of Directors', '/about#board', 40),
    ('/about', 'Partners', '/about#partners', 50),
    ('/about', 'Contact Us', '/contact', 60),

    ('/care-services', 'All Care Services', '/care-services', 5),
    ('/care-services', 'Elderly Care', '/care-services/elderly-care', 10),
    ('/care-services', 'Disability Support', '/care-services/disability-support', 20),
    ('/care-services', 'Autism Support', '/care-services/autism-support', 30),
    ('/care-services', 'Home Care', '/care-services/home-care', 40),
    ('/care-services', 'Community Support', '/care-services/community-support', 50),
    ('/care-services', 'Weekend Care', '/care-services/weekend-care', 60),
    ('/care-services', 'Nanny Services', '/care-services/nanny-services', 70),
    ('/care-services', 'Housekeeping', '/care-services/housekeeping', 80),
    ('/care-services', 'Therapy & Professionals', '/care-services/therapy-and-professionals', 90),
    ('/care-services', 'School Support', '/care-services/school-support', 100),
    ('/care-services', 'Hospital Support', '/care-services/hospital-support', 110),
    ('/care-services', 'Care for Loved Ones in Ghana', '/diaspora', 120),
    ('/care-services', 'Respite & Accommodation', '/respite', 130),

    ('/academy', 'Courses', '/academy', 10),
    ('/academy', 'Student Programme', '/academy#student-programme', 20),
    ('/academy', 'Parent & Family Learning', '/parent-and-family-learning', 30),
    ('/academy', 'Workforce Standards', '/academy/workforce-standards', 40),

    ('/join-our-team', 'Join Our Team', '/join-our-team', 10),
    ('/join-our-team', 'Wellbeing Hub', '/wellbeing', 20),
    ('/join-our-team', 'Schools & Hospitals', '/schools-and-hospitals', 30),

    ('/community', 'The ChaseCare Journal', '/journal', 10),
    ('/community', 'Monthly Forum', '/community/monthly-forum', 20),
    ('/community', 'Community & Partnerships', '/community', 30),
    ('/community', 'Shop', '/shop', 40)
)
insert into public.navigation_items (menu, label, href, parent_id, sort_order)
select 'main', c.label, c.href, p.id, c.sort_order
from children c
join public.navigation_items p
  on p.menu = 'main' and p.parent_id is null and p.href = c.parent_href;
