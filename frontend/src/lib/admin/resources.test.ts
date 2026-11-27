import { describe, expect, it } from "vitest";
import { RESOURCES, getResource, slugify } from "./resources";

describe("slugify", () => {
  it("makes clean web addresses", () => {
    expect(slugify("Elderly Care & Support!")).toBe("elderly-care-and-support");
    expect(slugify("  Café  Résumé ")).toBe("cafe-resume");
    expect(slugify("Community / Monthly Forum")).toBe("community/monthly-forum");
    expect(slugify("---")).toBe("");
  });
});

describe("resource definitions", () => {
  it("have unique keys, a title field among their fields, and known permission sections", () => {
    const keys = RESOURCES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of RESOURCES) {
      expect(r.fields.some((f) => f.name === r.titleField), r.key).toBe(true);
      expect(["content", "blog", "academy", "shop", "communications", "wellbeing"]).toContain(r.section);
      const names = r.fields.map((f) => f.name);
      expect(new Set(names).size, `${r.key} duplicate fields`).toBe(names.length);
    }
  });

  it("never lets the homepage be edited as a normal page", () => {
    expect(getResource("pages")?.exclude).toEqual({ column: "slug", value: "home" });
  });
});
