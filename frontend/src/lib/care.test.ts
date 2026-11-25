import { describe, expect, it } from "vitest";
import { EMPTY_REPORT, stepWithFirstError, validateReport, visitTimes, type ReportInput } from "./care";

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
