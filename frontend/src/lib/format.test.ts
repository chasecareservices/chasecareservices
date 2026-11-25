import { describe, expect, it } from "vitest";
import { certificationLabel, paragraphs, phoneDigits, whatsappLink } from "./format";

describe("certificationLabel", () => {
  it("never calls an internal or CPD course accredited", () => {
    expect(certificationLabel("internal")).not.toMatch(/accredited/i);
    expect(certificationLabel("cpd")).not.toMatch(/accredited/i);
    expect(certificationLabel("externally_accredited")).toMatch(/accredited/i);
  });
});

describe("phone helpers", () => {
  it("keeps only digits and a leading plus", () => {
    expect(phoneDigits("+233 (0) 24-123 4567")).toBe("+2330241234567");
  });

  it("builds a WhatsApp link without the plus", () => {
    expect(whatsappLink("+233 24 123 4567", "Hello there")).toBe("https://wa.me/233241234567?text=Hello%20there");
  });
});

describe("paragraphs", () => {
  it("splits on blank lines and drops empties", () => {
    expect(paragraphs("One\n\n\nTwo\n  \nThree")).toEqual(["One", "Two", "Three"]);
    expect(paragraphs(null)).toEqual([]);
  });
});
