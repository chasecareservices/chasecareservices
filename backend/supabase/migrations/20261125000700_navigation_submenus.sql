-- =============================================================================
-- Dropdown sub-menus for the main navigation (client sitemap, proposal §33).
-- Child items point at their parent through navigation_items.parent_id.
-- Only links to pages that exist are added; the owner can add more later.
-- Safe to run more than once: existing child links are not duplicated.
-- =============================================================================

with children (parent_href, label, href, sort_order) as (
  values
    ('/about', 'Who We Are', '/about#who-we-are', 10),
    ('/about', 'Vision & Mission', '/about#vision-and-mission', 20),
    ('/about', 'Our Values', '/about#our-values', 30),
    ('/about', 'Board of Directors', '/about#board', 40),
    ('/about', 'Partners', '/about#partners', 50),

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
    ('/care-services', 'Care for Loved Ones in Ghana (Diaspora)', '/diaspora', 120),

    ('/academy', 'Courses', '/academy', 10),
    ('/academy', 'Student Programme', '/academy#student-programme', 20),
    ('/academy', 'Parent & Family Learning', '/parent-and-family-learning', 30),
    ('/academy', 'Workforce Standards', '/academy/workforce-standards', 40),

    ('/respite', 'Family Respite', '/respite/family-respite', 10),
    ('/respite', 'Young People Respite', '/respite/young-people-respite', 20),
    ('/respite', 'Respite Residence', '/respite/respite-residence', 30),

    ('/journal', 'The ChaseCare Journal', '/journal', 10),
    ('/journal', 'Community', '/community', 20),
    ('/journal', 'Monthly Forum', '/community/monthly-forum', 30),
    ('/journal', 'Schools & Hospitals', '/schools-and-hospitals', 40)
)
insert into public.navigation_items (menu, label, href, parent_id, sort_order)
select 'main', c.label, c.href, p.id, c.sort_order
from children c
join public.navigation_items p
  on p.menu = 'main' and p.parent_id is null and p.href = c.parent_href
where not exists (
  select 1 from public.navigation_items existing
  where existing.parent_id = p.id and existing.href = c.href
);
