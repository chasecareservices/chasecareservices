import { describe, expect, it } from "vitest";
import { daysLeft, summarise } from "./data-requests";

describe("data requests", () => {
  it("summarises what is held", () => {
    expect(summarise({ enquiries: [1, 2], newsletter: { status: "subscribed" }, event_registrations: [1], job_applications: [], account: null })).toEqual([
      "2 website enquiries",
      "Newsletter: subscribed",
      "1 event registration",
    ]);
    expect(
      summarise({
        enquiries: [],
        newsletter: null,
        event_registrations: [],
        job_applications: [],
        account: { roles: ["worker"], family_of: [], courses: [1], certificates: [], wellbeing_requests: [], documents_and_checks: [], care_records: { visit_reports_written: 3, visits_booked: 4, incident_reports_written: 0 } },
      }),
    ).toEqual(["An account (worker)", "1 course enrolment", "Care work: 4 visits, 3 reports, 0 incident reports (kept)"]);
  });
  it("counts days to the deadline", () => {
    expect(daysLeft("2026-12-28", "2026-11-28")).toBe(30);
    expect(daysLeft("2026-11-20", "2026-11-28")).toBe(-8);
  });
});
