import { describe, expect, it } from "vitest";
import { actionLabel, changedFields, recordName, tableLabel } from "./audit";

describe("audit helpers", () => {
  it("lists changed fields, ignoring timestamps", () => {
    expect(changedFields({ a: 1, b: [1], updated_at: "x" }, { a: 2, b: [1], updated_at: "y", c: true })).toEqual(["a", "c"]);
    expect(changedFields(null, { a: 1 })).toEqual([]);
  });
  it("names records", () => {
    expect(recordName(null, { title: "Home care", slug: "home-care" })).toBe("Home care");
    expect(recordName({ slug: "gone" }, null)).toBe("gone");
    expect(recordName(null, { id: 1 })).toBe("");
    expect(recordName(null, { full_name: "Ama Mensah", reference: "CCS-1" }, "enquiries")).toBe("CCS-1");
  });
  it("labels actions and tables", () => {
    expect(actionLabel("UPDATE")).toBe("Changed");
    expect(tableLabel("team_members")).toBe("Team");
    expect(tableLabel("other_thing")).toBe("other thing");
  });
});
