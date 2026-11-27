import { describe, expect, it } from "vitest";
import { compliance, overall, reminderDue, requiredTypes, stateText, type Credential } from "./credentials";

const c = (o: Partial<Credential>): Credential => ({ id: Math.random().toString(), doc_type: "police_check", title: null, reference: null, issued_on: null, expires_on: null, status: "verified", note: null, created_at: "2026-01-01T00:00:00Z", ...o });
const today = "2026-12-01";

describe("worker documents", () => {
  it("requires a nursing licence only for nurses", () => {
    expect(requiredTypes([])).not.toContain("nursing_licence");
    expect(requiredTypes(["nursing"])).toContain("nursing_licence");
  });

  it("works out each document's state, worst first", () => {
    const rows = compliance(
      [
        c({ doc_type: "police_check", expires_on: "2026-11-20" }),
        c({ doc_type: "police_check", expires_on: "2027-11-20", status: "pending", created_at: "2026-11-30T00:00:00Z" }),
        c({ doc_type: "first_aid", expires_on: "2026-12-15" }),
        c({ doc_type: "passport", expires_on: "2030-01-01" }),
        c({ doc_type: "safeguarding" }),
      ],
      [],
      today,
    );
    const by = Object.fromEntries(rows.map((r) => [r.type, r]));
    expect(by.police_check.state).toBe("expired");
    expect(by.police_check.pending).not.toBeNull();
    expect(by.first_aid.state).toBe("expiring");
    expect(stateText(by.first_aid)).toBe("Expires in 14 days (15 Dec 2026)");
    expect(by.ghana_card.state).toBe("valid"); // the passport counts as ID
    expect(by.passport).toBeUndefined();
    expect(by.health_check.state).toBe("missing");
    expect(rows[0].state).toBe("expired");
    expect(overall(rows)).toEqual({ level: "problem", text: "2 required documents expired or missing" });
  });

  it("uses the newest verified document", () => {
    const rows = compliance([c({ expires_on: "2026-11-01" }), c({ expires_on: "2027-11-01" })], [], today);
    expect(rows.find((r) => r.type === "police_check")!.state).toBe("valid");
  });

  it("sends each reminder once", () => {
    expect(reminderDue("2027-03-01", 0, today)).toBe(0);
    expect(reminderDue("2026-12-25", 0, today)).toBe(1);
    expect(reminderDue("2026-12-25", 1, today)).toBe(0);
    expect(reminderDue("2026-12-05", 1, today)).toBe(2);
    expect(reminderDue("2026-11-30", 2, today)).toBe(3);
    expect(reminderDue("2026-11-30", 3, today)).toBe(0);
    expect(reminderDue("2026-12-05", 0, today)).toBe(2); // first noticed late: only the latest reminder
  });
});
