import { describe, expect, it } from "vitest";
import { FALLBACK_NAV } from "./navigation";
import { relatedLinksFor } from "./related";

const hrefs = (r: { links: { href: string }[] }) => r.links.map((l) => l.href);

describe("relatedLinksFor", () => {
  it("lists the About section's pages on /about (anchors), plus Request Care", () => {
    const r = relatedLinksFor(FALLBACK_NAV, "/about");
    expect(r.section).toBe("About Us");
    expect(hrefs(r)).toEqual([
      "/about#who-we-are",
      "/about/how-we-care",
      "/about#vision-and-mission",
      "/about#our-values",
      "/about#board",
      "/about#partners",
      "/contact",
      "/register/client",
    ]);
  });

  it("lists sibling pages and leaves out the current page", () => {
    const r = relatedLinksFor(FALLBACK_NAV, "/wellbeing");
    expect(r.section).toBe("Work With Us");
    expect(hrefs(r)).toEqual(["/join-our-team", "/schools-and-hospitals", "/register/client", "/contact"]);
  });

  it("keeps Request Care and Contact even when the section is long", () => {
    const menu = [
      {
        label: "Care Services",
        href: "/care-services",
        children: Array.from({ length: 14 }, (_, i) => ({ label: `S${i}`, href: `/care-services/s${i}` })),
      },
    ];
    const r = relatedLinksFor(menu, "/care-services/s3", 6);
    expect(r.links).toHaveLength(6);
    expect(hrefs(r).slice(-2)).toEqual(["/register/client", "/contact"]);
    expect(hrefs(r)).not.toContain("/care-services/s3");
  });

  it("keeps in-page sections of another page as separate entries", () => {
    expect(hrefs(relatedLinksFor(FALLBACK_NAV, "/academy/workforce-standards"))).toEqual([
      "/academy",
      "/academy#student-programme",
      "/parent-and-family-learning",
      "/register/client",
      "/contact",
    ]);
  });

  it("falls back to the always-shown links for pages outside the menu", () => {
    expect(hrefs(relatedLinksFor(FALLBACK_NAV, "/nowhere"))).toEqual(["/register/client", "/contact"]);
  });
});
