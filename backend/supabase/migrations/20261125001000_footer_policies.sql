-- =============================================================================
-- Footer policy links: Privacy Policy, Website Terms of Use, Acceptable Use
-- Policy, Cookie Policy. Rebuilds the footer menu only. Safe to run more than once.
-- =============================================================================

delete from public.navigation_items where menu = 'footer';

insert into public.navigation_items (menu, label, href, sort_order) values
  ('footer', 'Privacy Policy', '/privacy-policy', 10),
  ('footer', 'Website Terms of Use', '/terms-of-service', 20),
  ('footer', 'Acceptable Use Policy', '/acceptable-use-policy', 30),
  ('footer', 'Cookie Policy', '/cookie-policy', 40);
