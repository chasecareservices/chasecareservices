import { describe, expect, it } from "vitest";
import { ALL_CHECKS, missingChecks, stageLabel } from "./recruitment";

describe("recruitment", () => {
  it("lists every check as missing at first", () => {
    expect(missingChecks({})).toHaveLength(ALL_CHECKS.length);
  });
  it("accepts 'not needed' only for checks that may not apply", () => {
    const all = Object.fromEntries(ALL_CHECKS.map((c) => [c.key, "passed"]));
    expect(missingChecks(all)).toEqual([]);
    expect(missingChecks({ ...all, background_check: "not_needed" })).toEqual([]);
    expect(missingChecks({ ...all, interview: "not_needed" })).toEqual(["interview"]);
    expect(missingChecks({ ...all, references: "failed" })).toEqual(["references"]);
  });
  it("labels stages in plain words", () => {
    expect(stageLabel("training")).toBe("Training & competency");
    expect(stageLabel("rejected")).toBe("Not successful");
  });
});
