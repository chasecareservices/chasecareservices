import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS, getLegalDocument, legalPlainText, linkPolicies } from "./index";

describe("legal documents", () => {
  it("has the four footer policies with unique section ids", () => {
    expect(LEGAL_DOCUMENTS.map((d) => d.slug)).toEqual([
      "privacy-policy",
      "terms-of-service",
      "acceptable-use-policy",
      "cookie-policy",
    ]);
    for (const doc of LEGAL_DOCUMENTS) {
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size, doc.slug).toBe(ids.length);
      expect(doc.sections.length, doc.slug).toBeGreaterThan(3);
    }
  });

  it("is written for Chase Care in Ghana, with nothing left over from another organisation", () => {
    const all = LEGAL_DOCUMENTS.map(legalPlainText).join(" ");
    expect(all).toMatch(/Chase Care/);
    expect(all).toMatch(/Data Protection Act, 2012 \(Act 843\)/);
    expect(all).toMatch(/Data Protection Commission/);
    expect(all).not.toMatch(/PeoplePlus|People Plus|ICO\b|Information Commissioner|English law|England/i);
  });

  it("looks documents up by slug", () => {
    expect(getLegalDocument("cookie-policy")?.title).toBe("Cookie Policy");
    expect(getLegalDocument("nope")).toBeUndefined();
  });
});

describe("linkPolicies", () => {
  it("links other policies but not the current one", () => {
    const parts = linkPolicies("See our Privacy Policy and our Cookie Policy.", "cookie-policy");
    expect(parts).toEqual([
      { text: "See our " },
      { text: "Privacy Policy", href: "/privacy-policy" },
      { text: " and our Cookie Policy." },
    ]);
  });
});
