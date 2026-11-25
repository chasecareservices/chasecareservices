import { describe, expect, it } from "vitest";
import { EMPTY_REPORT, distanceMetres, formatDistance, parseLatLng, stepWithFirstError, validateReport, visitTimes, visitVerdict, type ReportInput } from "./care";

const good: ReportInput = {
  ...EMPTY_REPORT,
  client_id: "c1",
  visit_date: "2026-11-25",
  start_time: "09:00",
  end_time: "13:00",
  mood: "good",
  activities: ["meals", "meals", "not-a-real-one"],
  meals: "ate_well",
  medication: "as_prescribed",
  summary: "  Helped with lunch and a short walk.  ",
};

describe("validateReport", () => {
  it("accepts a complete report and tidies it", () => {
    const { errors, value } = validateReport(good, "2026-11-25");
    expect(errors).toEqual({});
    expect(value?.summary).toBe("Helped with lunch and a short walk.");
    expect(value?.activities).toEqual(["meals"]);
  });

  it("explains each missing answer in plain words", () => {
    const { errors, value } = validateReport({ ...EMPTY_REPORT }, "2026-11-25");
    expect(value).toBeNull();
    expect(errors.client_id).toMatch(/who you visited/);
    expect(errors.mood).toMatch(/how they seemed/);
    expect(errors.summary).toMatch(/few words/);
  });

  it("catches impossible times and future dates", () => {
    expect(validateReport({ ...good, end_time: "08:00" }, "2026-11-25").errors.end_time).toMatch(/after the start/);
    expect(validateReport({ ...good, visit_date: "2026-11-26" }, "2026-11-25").errors.visit_date).toMatch(/future/);
    expect(validateReport({ ...good, start_time: "9am" }, "2026-11-25").errors.start_time).toMatch(/09:30/);
  });

  it("requires an explanation for any concern, and drops it when there is none", () => {
    expect(validateReport({ ...good, concern_level: "urgent" }, "2026-11-25").errors.concerns).toMatch(/Describe/);
    expect(validateReport({ ...good, concern_level: "none", concerns: "old text" }, "2026-11-25").value?.concerns).toBe("");
  });

  it("points to the step with the first problem", () => {
    expect(stepWithFirstError({ summary: "x" })).toBe(2);
    expect(stepWithFirstError({ mood: "x", summary: "x" })).toBe(1);
    expect(stepWithFirstError({})).toBe(0);
  });
});

describe("visitTimes", () => {
  it("shows the length of the visit", () => {
    expect(visitTimes("09:00:00", "13:30:00")).toBe("09:00 – 13:30 (4 h 30 min)");
    expect(visitTimes("09:00", "09:45")).toBe("09:00 – 09:45 (45 min)");
    expect(visitTimes(null, null)).toBe("Times not given");
  });
});

describe("visit locations", () => {
  const home = { lat: 5.6037, lng: -0.187 };
  const now = Date.parse("2026-11-25T12:00:00Z");

  it("measures distance and formats it", () => {
    expect(Math.round(distanceMetres(home, { lat: 5.6037, lng: -0.1861 }))).toBeGreaterThan(90);
    expect(formatDistance(42)).toBe("40 m");
    expect(formatDistance(2340)).toBe("2.3 km");
  });

  it("decides whether the worker was at the home, allowing for accuracy", () => {
    const at = visitVerdict({ status: "captured", lat: 5.6038, lng: -0.1871, accuracy: 15 }, home);
    expect(at.kind).toBe("at_home");
    const far = visitVerdict({ status: "captured", lat: 5.65, lng: -0.19, accuracy: 15 }, home);
    expect(far.kind).toBe("away");
    expect(visitVerdict({ status: "captured", lat: 5.6, lng: -0.18, accuracy: 10 }, { lat: null, lng: null }).kind).toBe("no_home");
    const none = visitVerdict({ status: "denied", lat: null, lng: null, accuracy: null }, home);
    expect(none).toEqual({ kind: "no_location", reason: "Location was blocked on the phone" });
  });

  it("reads coordinates from Google Maps links and plain text", () => {
    expect(parseLatLng("5.6037, -0.1870")).toEqual({ lat: 5.6037, lng: -0.187 });
    expect(parseLatLng("https://www.google.com/maps/@5.6037,-0.187,17z")).toEqual({ lat: 5.6037, lng: -0.187 });
    expect(parseLatLng("https://www.google.com/maps/place/X/@5.6,-0.1,17z/data=!3m1!4b1!4m6!3m5!8m2!3d5.6037!4d-0.187")).toEqual({ lat: 5.6037, lng: -0.187 });
    expect(parseLatLng("https://maps.google.com/?q=5.6037,-0.187")).toEqual({ lat: 5.6037, lng: -0.187 });
    expect(parseLatLng("Spintex Road")).toBeNull();
  });

  it("requires a location decision for new reports", () => {
    expect(validateReport(good, "2026-11-25", { needLocation: true, now }).errors.location).toMatch(/Share your location/);
    expect(validateReport({ ...good, location: { status: "denied" } }, "2026-11-25", { needLocation: true, now }).errors.location).toBeUndefined();
    const fresh = { status: "captured" as const, lat: 5.6, lng: -0.18, accuracy: 12, captured_at: "2026-11-25T11:58:00Z" };
    expect(validateReport({ ...good, location: fresh }, "2026-11-25", { needLocation: true, now }).errors.location).toBeUndefined();
    const stale = { ...fresh, captured_at: "2026-11-20T11:58:00Z" };
    expect(validateReport({ ...good, location: stale }, "2026-11-25", { needLocation: true, now }).errors.location).toMatch(/didn't work/);
  });
});
