import { describe, expect, it } from "vitest";
import { buildNavTree, isActive } from "./navigation";

const rows = [
  { id: "a", label: "About Us", href: "/about", parent_id: null, sort_order: 20 },
  { id: "h", label: "Home", href: "/", parent_id: null, sort_order: 10 },
  { id: "a2", label: "Our Values", href: "/about#our-values", parent_id: "a", sort_order: 30 },
  { id: "a1", label: "Who We Are", href: "/about#who-we-are", parent_id: "a", sort_order: 10 },
  { id: "x", label: "Hidden", href: "/about#hidden", parent_id: "a", sort_order: 5, is_visible: false },
];

describe("buildNavTree", () => {
  it("nests children under parents, in order, skipping hidden items", () => {
    expect(buildNavTree(rows)).toEqual([
      { label: "Home", href: "/" },
      {
        label: "About Us",
        href: "/about",
        children: [
          { label: "Who We Are", href: "/about#who-we-are" },
          { label: "Our Values", href: "/about#our-values" },
        ],
      },
    ]);
  });
});

describe("isActive", () => {
  const care = {
    label: "Care Services",
    href: "/care-services",
    children: [{ label: "Diaspora", href: "/diaspora" }],
  };

  it("matches the section page, its sub-pages and child links", () => {
    expect(isActive(care, "/care-services")).toBe(true);
    expect(isActive(care, "/care-services/elderly-care")).toBe(true);
    expect(isActive(care, "/diaspora/welfare-visits")).toBe(true);
    expect(isActive(care, "/academy")).toBe(false);
  });

  it("only matches home on the homepage", () => {
    expect(isActive({ label: "Home", href: "/" }, "/")).toBe(true);
    expect(isActive({ label: "Home", href: "/" }, "/about")).toBe(false);
  });
});
