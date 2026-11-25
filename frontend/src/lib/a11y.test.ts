import { describe, expect, it } from "vitest";
import { A11Y_BOOT_SCRIPT, DEFAULT_A11Y, parsePrefs, prefClasses } from "./a11y";

describe("parsePrefs", () => {
  it("reads saved preferences", () => {
    expect(parsePrefs('{"textSize":2,"contrast":true,"links":false,"font":true,"motion":true}')).toEqual({
      textSize: 2,
      contrast: true,
      links: false,
      font: true,
      motion: true,
    });
  });

  it("falls back to defaults for missing, broken or odd values", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_A11Y);
    expect(parsePrefs("{not json")).toEqual(DEFAULT_A11Y);
    expect(parsePrefs('{"textSize":9,"contrast":"yes"}')).toEqual(DEFAULT_A11Y);
  });
});

describe("prefClasses", () => {
  it("maps preferences to html classes", () => {
    expect(prefClasses(DEFAULT_A11Y)).toEqual([]);
    expect(prefClasses({ textSize: 1, contrast: true, links: true, font: false, motion: true })).toEqual([
      "a11y-text-1",
      "a11y-contrast",
      "a11y-links",
      "a11y-no-motion",
    ]);
  });
});

describe("boot script", () => {
  it("applies the same classes as prefClasses", () => {
    const classes = new Set<string>();
    const storage = new Map([["chase-a11y", '{"textSize":2,"font":true,"motion":true}']]);
    const fakeWindow = {
      localStorage: { getItem: (k: string) => storage.get(k) ?? null },
      document: { documentElement: { classList: { add: (c: string) => classes.add(c) } } },
    };
    new Function("localStorage", "document", A11Y_BOOT_SCRIPT)(fakeWindow.localStorage, fakeWindow.document);
    expect([...classes]).toEqual(prefClasses(parsePrefs('{"textSize":2,"font":true,"motion":true}')));
  });
});
