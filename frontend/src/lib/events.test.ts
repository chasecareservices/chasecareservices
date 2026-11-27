import { describe, expect, it } from "vitest";
import { eventIcs, eventSlug, eventTime, isOver, registrationError } from "./events";

describe("events", () => {
  it("formats times in Ghana time", () => {
    expect(eventTime("2026-12-17T17:00:00Z", "2026-12-17T19:00:00Z")).toBe("5:00pm – 7:00pm");
  });
  it("knows when an event is over", () => {
    const now = Date.parse("2026-12-17T20:00:00Z");
    expect(isOver({ starts_at: "2026-12-17T17:00:00Z", ends_at: "2026-12-17T19:00:00Z" }, now)).toBe(true);
    expect(isOver({ starts_at: "2026-12-17T19:00:00Z", ends_at: null }, now)).toBe(false);
  });
  it("makes slugs", () => {
    expect(eventSlug("Disability Inclusion: Outreach Day!", "2026-12-21T09:00:00Z")).toBe("disability-inclusion-outreach-day-2026-12-21");
  });
  it("explains registration errors", () => {
    expect(registrationError("53400", undefined)).toMatch(/full/);
    expect(registrationError("22023", "Name is required")).toBe("Name is required");
  });
  it("builds a valid calendar file", () => {
    const ics = eventIcs(
      { id: "abc", title: "Forum: Dementia, care; and you", summary: "Line one\nLine two", starts_at: "2026-12-17T17:00:00Z", ends_at: null, venue: "Accra" },
      "https://www.chasecareservices.org/community/events/forum-2026-12",
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(ics).toContain("DTSTART:20261217T170000Z");
    expect(ics).toContain("DTEND:20261217T190000Z");
    expect(ics).toContain("SUMMARY:Forum: Dementia\\, care\\; and you");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});
