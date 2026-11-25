export type NavLink = { label: string; href: string; children?: NavLink[] };

type NavRow = { id: string; label: string; href: string; parent_id: string | null; sort_order: number; is_visible?: boolean };

/** Turns flat navigation_items rows into a menu tree (one level of sub-menus). */
export function buildNavTree(rows: NavRow[]): NavLink[] {
  const visible = rows.filter((r) => r.is_visible !== false).sort((a, b) => a.sort_order - b.sort_order);
  const topLevel = visible.filter((r) => !r.parent_id);
  return topLevel.map((parent) => {
    const children = visible
      .filter((r) => r.parent_id === parent.id)
      .map((c) => ({ label: c.label, href: c.href }));
    return children.length ? { label: parent.label, href: parent.href, children } : { label: parent.label, href: parent.href };
  });
}

/** Used only if the navigation table is empty or unreachable. */
export const FALLBACK_NAV: NavLink[] = [
  { label: "Home", href: "/" },
  {
    label: "About Us",
    href: "/about",
    children: [
      { label: "Who We Are", href: "/about#who-we-are" },
      { label: "Vision & Mission", href: "/about#vision-and-mission" },
      { label: "Our Values", href: "/about#our-values" },
      { label: "Board of Directors", href: "/about#board" },
      { label: "Partners", href: "/about#partners" },
    ],
  },
  {
    label: "Care Services",
    href: "/care-services",
    children: [
      { label: "All Care Services", href: "/care-services" },
      { label: "Care for Loved Ones in Ghana (Diaspora)", href: "/diaspora" },
    ],
  },
  {
    label: "Training Academy",
    href: "/academy",
    children: [
      { label: "Courses", href: "/academy" },
      { label: "Student Programme", href: "/academy#student-programme" },
      { label: "Parent & Family Learning", href: "/parent-and-family-learning" },
      { label: "Workforce Standards", href: "/academy/workforce-standards" },
    ],
  },
  { label: "Respite & Accommodation", href: "/respite" },
  { label: "Wellbeing Hub", href: "/wellbeing" },
  { label: "Join Our Team", href: "/join-our-team" },
  { label: "Client Registration", href: "/register/client" },
  {
    label: "Resources",
    href: "/journal",
    children: [
      { label: "The ChaseCare Journal", href: "/journal" },
      { label: "Community", href: "/community" },
      { label: "Monthly Forum", href: "/community/monthly-forum" },
      { label: "Schools & Hospitals", href: "/schools-and-hospitals" },
    ],
  },
  { label: "Shop", href: "/shop" },
  { label: "Contact", href: "/contact" },
];

/** True when `pathname` is this link's page or one of its sub-pages. */
export function isActive(link: NavLink, pathname: string): boolean {
  const base = (href: string) => href.split("#")[0];
  const match = (href: string) => {
    const b = base(href);
    return b === "/" ? pathname === "/" : pathname === b || pathname.startsWith(`${b}/`);
  };
  return match(link.href) || (link.children ?? []).some((c) => match(c.href));
}
