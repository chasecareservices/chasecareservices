import { describe, expect, it } from "vitest";
import { formatLongDate, nextForumDate, thirdThursday } from "./forum";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("thirdThursday", () => {
  it.each([
    [2026, 10, "2026-11-19"], // November 2026: 1st is a Sunday
    [2026, 0, "2026-01-15"], // January 2026: 1st is a Thursday
    [2027, 1, "2027-02-18"], // February 2027
    [2026, 9, "2026-10-15"], // October 2026: 1st is a Thursday
  ])("%i-%i → %s", (year, month, expected) => {
    expect(iso(thirdThursday(year, month))).toBe(expected);
  });
});

describe("nextForumDate", () => {
  it("returns this month's forum when it is still ahead", () => {
    expect(iso(nextForumDate(new Date("2026-11-02T10:00:00Z")))).toBe("2026-11-19");
  });

  it("returns today on the forum day itself", () => {
    expect(iso(nextForumDate(new Date("2026-11-19T18:00:00Z")))).toBe("2026-11-19");
  });

  it("moves to next month once this month's forum has passed", () => {
    expect(iso(nextForumDate(new Date("2026-11-25T09:00:00Z")))).toBe("2026-12-17");
  });

  it("rolls over the year", () => {
    expect(iso(nextForumDate(new Date("2026-12-30T09:00:00Z")))).toBe("2027-01-21");
  });
});

describe("formatLongDate", () => {
  it("formats in British English", () => {
    // Some Node/ICU versions put a comma after the weekday.
    expect(formatLongDate(new Date("2026-12-17T00:00:00Z"))).toMatch(/^Thursday,? 17 December 2026$/);
  });
});
