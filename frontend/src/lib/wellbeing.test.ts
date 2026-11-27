import { describe, expect, it } from "vitest";
import { kindLabel, splitResources, statusLabel, validateRequest } from "./wellbeing";

describe("validateRequest", () => {
  const ok = { kind: "counselling", urgency: "soon", contact_method: "whatsapp", contact_times: "  evenings ", message: "  I can't sleep.  " };
  it("accepts and tidies a request", () => {
    expect(validateRequest(ok)).toEqual({ value: { ...ok, contact_times: "evenings", message: "I can't sleep." } });
  });
  it("rejects unknown choices and empty messages", () => {
    expect(validateRequest({ ...ok, kind: "x" })).toHaveProperty("error");
    expect(validateRequest({ ...ok, urgency: "x" })).toHaveProperty("error");
    expect(validateRequest({ ...ok, contact_method: "x" })).toHaveProperty("error");
    expect(validateRequest({ ...ok, message: " " })).toHaveProperty("error");
  });
});

describe("labels", () => {
  it("uses worker and staff wording", () => {
    expect(statusLabel("in_progress")).toBe("We're on it");
    expect(statusLabel("in_progress", true)).toBe("In progress");
    expect(kindLabel("laboratory")).toBe("Laboratory tests");
  });
});

describe("splitResources", () => {
  it("lists upcoming sessions soonest first and keeps the library apart", () => {
    const now = Date.parse("2026-12-01T12:00:00Z");
    const rows = [
      { id: "a", starts_at: "2026-12-10T16:00:00Z" },
      { id: "b", starts_at: null },
      { id: "c", starts_at: "2026-12-03T16:00:00Z" },
      { id: "d", starts_at: "2026-11-01T16:00:00Z" },
    ];
    const { upcoming, library } = splitResources(rows, now);
    expect(upcoming.map((r) => r.id)).toEqual(["c", "a"]);
    expect(library.map((r) => r.id)).toEqual(["b"]);
  });
});
