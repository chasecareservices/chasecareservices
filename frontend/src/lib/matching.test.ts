import { describe, expect, it } from "vitest";
import { distanceKm, isoWeekday, rankWorkers, weekOf, workerSkills, type MatchWorker } from "./matching";

const base: MatchWorker = {
  id: "w",
  name: "Worker",
  gender: "female",
  skills: [],
  certificates: [],
  languages: ["Twi"],
  lat: 5.635,
  lng: -0.161,
  travel_km: 15,
  max_hours_week: 40,
  availability: [{ weekday: 1, start_time: "08:00:00", end_time: "16:00:00" }],
  time_off: [],
  visits_that_day: [],
  week_minutes: 0,
  on_care_team: false,
};
const client = { required_skills: ["dementia"], preferred_gender: "female", languages: ["Twi"], lat: 5.64, lng: -0.17 };
const monday = { date: "2026-12-07", start: "09:00", end: "13:00" };

describe("matching", () => {
  it("knows weekdays, weeks and distances", () => {
    expect(isoWeekday("2026-12-07")).toBe(1);
    expect(isoWeekday("2026-12-13")).toBe(7);
    expect(weekOf("2026-12-10")).toEqual({ monday: "2026-12-07", sunday: "2026-12-13" });
    expect(Math.round(distanceKm({ lat: 5.6037, lng: -0.187 }, { lat: 5.6698, lng: -0.0166 }))).toBe(20);
  });

  it("counts Academy certificates as skills", () => {
    const s = workerSkills(["nursing"], ["Dementia Care", "Manual Handling"]);
    expect([...s.all].sort()).toEqual(["dementia", "mobility", "nursing"]);
    expect(s.certified.get("dementia")).toBe("Dementia Care");
  });

  it("puts the best fit first and explains why", () => {
    const good = { ...base, id: "good", name: "Ama", certificates: ["Dementia Care"], on_care_team: true };
    const noSkill = { ...base, id: "noskill", name: "Esi" };
    const male = { ...base, id: "male", name: "Kofi", gender: "male", certificates: ["Dementia Care"] };
    const [first, second, third] = rankWorkers(client, monday, [noSkill, male, good]);
    expect(first.worker.id).toBe("good");
    expect(first.checks.filter((c) => c.ok).map((c) => c.text)).toEqual([
      "Usually free Mondays 08:00–16:00",
      "Dementia care: Dementia Care certificate",
      "Female carer, as the client prefers",
      "Speaks Twi",
      "About 1.1 km away",
      "Already on this client's care team",
    ]);
    expect([second.worker.id, third.worker.id]).toEqual(["noskill", "male"]);
  });

  it("puts people on leave or already booked last, with the reason", () => {
    const leave = { ...base, id: "leave", certificates: ["Dementia Care"], on_care_team: true, time_off: [{ starts_on: "2026-12-05", ends_on: "2026-12-08", kind: "leave" }] };
    const busy = { ...base, id: "busy", certificates: ["Dementia Care"], visits_that_day: [{ start_time: "12:00:00", end_time: "14:00:00", client: "Kofi" }] };
    const free = { ...base, id: "free" };
    const r = rankWorkers(client, monday, [leave, busy, free]);
    expect(r[0].worker.id).toBe("free");
    expect(r.slice(1).every((m) => m.blocked)).toBe(true);
    expect(r.find((m) => m.worker.id === "busy")!.checks[0].text).toBe("Already booked 12:00–14:00 with Kofi");
    expect(r.find((m) => m.worker.id === "leave")!.checks[0].text).toBe("Off that day (leave / holiday)");
  });

  it("warns about hours, partial availability and distance", () => {
    const tired = { ...base, max_hours_week: 20, week_minutes: 18 * 60, availability: [{ weekday: 1, start_time: "10:00:00", end_time: "16:00:00" }], lat: 6.69, lng: -1.62 };
    const texts = rankWorkers(client, monday, [tired])[0].checks.map((c) => c.text);
    expect(texts).toContain("Only partly free then (10:00–16:00)");
    expect(texts).toContain("Would work 22 h that week (wants at most 20 h)");
    expect(texts.some((t) => /further than their 15 km/.test(t))).toBe(true);
  });
});

describe("availabilityFromForm", () => {
  it("reads ticked days and checks the times", async () => {
    const { availabilityFromForm } = await import("./matching");
    const f = (o: Record<string, string>) => (k: string) => o[k] ?? null;
    expect(availabilityFromForm(f({ day_1: "on", from_1: "08:00", to_1: "16:00", from_2: "09:00", to_2: "10:00" }))).toEqual({
      rows: [{ weekday: 1, start_time: "08:00", end_time: "16:00" }],
    });
    expect(availabilityFromForm(f({ day_3: "on", from_3: "16:00", to_3: "08:00" }))).toEqual({ error: "On Wednesday the finish time must be after the start time." });
  });
});

describe("documents in matching", () => {
  it("warns about expired documents and ranks the worker lower", () => {
    const ok = { ...base, id: "ok", name: "Ok" };
    const expired = { ...base, id: "exp", name: "Exp", on_care_team: true, certificates: ["Dementia Care"], document_blocks: ["Police check: expired 3 nov 2026"] };
    const missing = { ...base, id: "mis", name: "Mis", document_warnings: ["Health check: missing"] };
    const r = rankWorkers(client, monday, [expired, missing, ok]);
    expect(r.map((m) => m.worker.id)).toEqual(["ok", "mis", "exp"]);
    expect(r[2].blocked).toBe(true);
    expect(r[2].checks[0]).toEqual({ ok: false, text: "Police check: expired 3 nov 2026" });
    expect(r[1].checks[0]).toEqual({ ok: false, text: "Health check: missing" });
  });
});
