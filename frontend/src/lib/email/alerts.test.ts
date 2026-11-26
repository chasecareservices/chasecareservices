import { describe, expect, it } from "vitest";
import { careConcernAlert, enquiryAlert } from "./alerts";

const site = "https://chasecareservices.vercel.app";

describe("enquiry alert", () => {
  const e = { id: "e1", enquiry_type: "care_request", full_name: "Ama <b>Mensah</b>", email: "ama@example.com", phone: "+233 55 000 0000", country: "UK", subject: null };
  const a = enquiryAlert(e, site);
  it("names the kind of enquiry and the person", () => {
    expect(a.subject).toBe("New care request: Ama <b>Mensah</b>");
    expect(a.text).toContain("Phone: +233 55 000 0000");
    expect(a.text).toContain(`${site}/admin/enquiries/e1`);
    expect(a.replyTo).toBe("ama@example.com");
  });
  it("escapes what visitors typed, so it can't inject HTML into the email", () => {
    expect(a.html).not.toContain("<b>Mensah</b>");
    expect(a.html).toContain("Ama &lt;b&gt;Mensah&lt;/b&gt;");
  });
});

describe("care concern alert", () => {
  const r = { id: "r1", reference: "CR-000007", concern_level: "urgent", visit_date: "2026-11-26", client_name: "Akosua Boateng", worker_name: "Ama Mensah" };
  it("marks urgent reports and links to the report", () => {
    const a = careConcernAlert(r, site);
    expect(a.subject).toBe("URGENT: Care concern — Akosua Boateng (CR-000007)");
    expect(a.text).toContain(`${site}/admin/care-reports/r1`);
  });
  it("says 'keep an eye on it' for lower concerns", () => {
    const a = careConcernAlert({ ...r, concern_level: "monitor" }, site);
    expect(a.subject.startsWith("URGENT")).toBe(false);
    expect(a.text).toContain("Keep an eye on it");
  });
  it("never carries the health details of the concern", () => {
    const a = careConcernAlert(r, site);
    expect(a.text).toMatch(/only in the dashboard/);
    expect(Object.keys(r)).not.toContain("concerns");
  });
});
