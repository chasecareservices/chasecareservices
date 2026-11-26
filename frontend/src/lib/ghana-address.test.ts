import { describe, expect, it } from "vitest";
import { cleanDigitalAddress } from "./ghana-address";

describe("cleanDigitalAddress", () => {
  it("tidies the common ways people type it", () => {
    expect(cleanDigitalAddress("ga-183-8164")).toBe("GA-183-8164");
    expect(cleanDigitalAddress(" GA 1838 1640 ")).toBe("GA-1838-1640");
    expect(cleanDigitalAddress("AK4851234")).toBe("AK-485-1234");
  });
  it("tells empty apart from wrong", () => {
    expect(cleanDigitalAddress("")).toBeNull();
    expect(cleanDigitalAddress("Spintex")).toBeUndefined();
    expect(cleanDigitalAddress("GA-12-34")).toBeUndefined();
  });
});
