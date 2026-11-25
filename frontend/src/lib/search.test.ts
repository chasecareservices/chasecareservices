import { describe, expect, it } from "vitest";
import { groupResults, mergeResults, searchBuiltInPages, searchTokens, type SearchResult } from "./search";

describe("searchTokens", () => {
  it("lower-cases, strips symbols, drops 1-letter words and caps at 8", () => {
    expect(searchTokens("  Elderly-CARE!! a ")).toEqual(["elderly", "care"]);
    expect(searchTokens("'); drop table x; --")).toEqual(["drop", "table"]);
    expect(searchTokens("a b c d e f g h i j k l m n")).toEqual([]);
    expect(searchTokens("one two three four five six seven eight nine")).toHaveLength(8);
  });
});

describe("searchBuiltInPages", () => {
  it("finds built-in pages by title, summary or list items, with partial words", () => {
    const urls = (q: string) => searchBuiltInPages(q).map((r) => r.url);
    expect(urls("wellbeing")).toContain("/wellbeing");
    expect(urls("counsel")).toContain("/wellbeing"); // "Counselling and emotional wellbeing support"
    expect(urls("abroad")).toContain("/diaspora");
    expect(urls("forum")).toContain("/community/monthly-forum");
  });

  it("needs every word to match", () => {
    expect(searchBuiltInPages("wellbeing zzzz")).toEqual([]);
  });

  it("returns nothing for an empty search", () => {
    expect(searchBuiltInPages("  ")).toEqual([]);
  });
});

describe("mergeResults / groupResults", () => {
  const r = (url: string, rank: number, kind: SearchResult["kind"] = "page"): SearchResult => ({ kind, title: url, summary: null, url, rank });

  it("keeps the best entry per address and sorts by rank", () => {
    const merged = mergeResults([r("/a", 0.2), r("/b", 0.9)], [r("/a", 0.5)]);
    expect(merged.map((x) => [x.url, x.rank])).toEqual([
      ["/b", 0.9],
      ["/a", 0.5],
    ]);
  });

  it("groups by kind, best match first, and drops empty groups", () => {
    expect(groupResults([r("/s", 1, "service"), r("/p", 1, "page")]).map((g) => g.label)).toEqual(["Pages", "Services"]);
    expect(groupResults([r("/s", 1.7, "service"), r("/p", 0.05, "page")]).map((g) => g.label)).toEqual(["Services", "Pages"]);
  });
});
