import { describe, expect, it } from "vitest";
import { cookieDomains, languageFromCookie } from "./languages";

describe("languageFromCookie", () => {
  it("reads the chosen language", () => {
    expect(languageFromCookie("a=1; googtrans=/en/ak; b=2")).toBe("ak");
    expect(languageFromCookie("googtrans=%2Fen%2Fgaa")).toBe("gaa");
  });

  it("falls back to English when missing or not offered", () => {
    expect(languageFromCookie("")).toBe("en");
    expect(languageFromCookie("googtrans=/en/xx")).toBe("en");
    expect(languageFromCookie("notgoogtrans=/en/ak")).toBe("en");
  });
});

describe("cookieDomains", () => {
  it("covers the host and the parent domain", () => {
    expect(cookieDomains("www.chasecareservices.org")).toEqual([null, ".chasecareservices.org"]);
  });

  it("uses a host-only cookie for localhost and IP addresses", () => {
    expect(cookieDomains("localhost")).toEqual([null]);
    expect(cookieDomains("127.0.0.1")).toEqual([null]);
  });
});
