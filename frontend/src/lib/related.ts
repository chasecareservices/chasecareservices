import type { NavLink } from "@/lib/navigation";

export type RelatedLinks = { section: string; links: NavLink[] };

const ALWAYS: NavLink[] = [
  { label: "Request Care", href: "/register/client" },
  { label: "Contact Us", href: "/contact" },
];

const pathOf = (href: string) => href.split("#")[0];

/**
 * The "Related information" links for a page: the other pages in the same menu section,
 * then Request Care and Contact Us. Built from the main menu so it never goes out of date.
 */
export function relatedLinksFor(menu: NavLink[], pathname: string, max = 9): RelatedLinks {
  const inSection = (section: NavLink) =>
    pathOf(section.href) === pathname || (section.children ?? []).some((c) => pathOf(c.href) === pathname);
  // Prefer the section whose own link is this page (e.g. /about), then any section listing it.
  const section =
    menu.find((s) => pathOf(s.href) === pathname && s.children?.length) ?? menu.find((s) => s.children?.length && inSection(s));

  const seen = new Set<string>([pathname]);
  const pick = (list: NavLink[]) =>
    list.filter((link) => {
      const path = pathOf(link.href);
      // Leave out the page itself (but keep in-page sections such as /about#board).
      if (path === pathname && !link.href.includes("#")) return false;
      // In-page sections (e.g. /academy#student-programme) count as their own entries.
      const key = link.href.includes("#") ? link.href : path;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const sectionLinks = pick(section?.children ?? []);
  const always = pick(ALWAYS);
  // Keep the always-shown links even when the section is long.
  return {
    section: section?.label ?? "Chase Care",
    links: [...sectionLinks.slice(0, Math.max(0, max - always.length)), ...always].map(({ label, href }) => ({ label, href })),
  };
}
