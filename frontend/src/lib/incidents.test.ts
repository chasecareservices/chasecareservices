import { describe, expect, it } from "vitest";
import { validateIncident, type IncidentInput } from "./incidents";

const now = Date.parse("2026-11-26T12:00:00Z");
const good: IncidentInput = {
  client_id: "00000000-0000-4000-8000-00000000c001",
  occurred_at: "2026-11-26T10:30",
  place: "  Bathroom ",
  kind: "fall",
  severity: "moderate",
  what_happened: "  Slipped on the wet step and bumped her knee. ",
  action_taken: "Helped her up, cold compress, called her daughter.",
  people_told: ["family", "family", "aliens"],
  witnesses: "",
};

describe("validateIncident", () => {
  it("accepts a complete report and tidies it", () => {
    const r = validateIncident(good, now);
    expect("value" in r && r.value).toMatchObject({
      occurred_at: "2026-11-26T10:30:00.000Z",
      place: "Bathroom",
      what_happened: "Slipped on the wet step and bumped her knee.",
      people_told: ["family"],
      witnesses: null,
    });
  });

  it("explains problems in plain words", () => {
    const err = (p: Partial<IncidentInput>) => {
      const r = validateIncident({ ...good, ...p }, now);
      return "error" in r ? r.error : "";
    };
    expect(err({ client_id: "" })).toMatch(/who/);
    expect(err({ occurred_at: "2026-11-27T10:00" })).toMatch(/future/);
    expect(err({ occurred_at: "2026-09-01T10:00" })).toMatch(/call the office/);
    expect(err({ kind: "x" })).toMatch(/kind/);
    expect(err({ severity: "" })).toMatch(/serious/);
    expect(err({ what_happened: "fell" })).toMatch(/Describe/);
    expect(err({ action_taken: "" })).toMatch(/Nothing yet/);
  });
});
