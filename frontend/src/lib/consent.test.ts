import { describe, expect, it } from "vitest";
import { CONSENT_COOKIE, parseConsent, serializeConsent } from "./consent";

describe("cookie consent", () => {
  it("round-trips the choice", () => {
    const c = { preferences: true, at: "2026-11-26T10:00:00.000Z" };
    expect(parseConsent(`a=1; ${CONSENT_COOKIE}=${serializeConsent(c)}; b=2`)).toEqual(c);
    expect(parseConsent(`${CONSENT_COOKIE}=${serializeConsent({ ...c, preferences: false })}`)?.preferences).toBe(false);
  });

  it("asks again when there is no choice, a damaged one, or one from an older banner", () => {
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=%E0%A4%A`)).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=${encodeURIComponent("0|1|2026-01-01")}`)).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=${encodeURIComponent("1|yes|2026-01-01")}`)).toBeNull();
  });
});
