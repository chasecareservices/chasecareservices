import { describe, expect, it } from "vitest";
import { fill, renderCopy, unknownPlaceholders } from "./templates";

describe("email templates", () => {
  it("uses the built-in wording when nothing is set", () => {
    expect(renderCopy("event_confirmation", null, { first_name: "Esi", event: "Forum" })).toEqual({ subject: "You're registered: Forum", heading: "You're registered, Esi!", message: "" });
  });
  it("uses the owner's wording field by field", () => {
    const c = renderCopy("course_ready", { subject: "Akwaaba! {course} is ready", heading: "  " }, { first_name: "Abena", course: "Dementia Care" });
    expect(c.subject).toBe("Akwaaba! Dementia Care is ready");
    expect(c.heading).toBe("Hello Abena, your course is ready");
  });
  it("leaves unknown placeholders visible and reports them", () => {
    expect(fill("Hi {firstname}", { first_name: "A" })).toBe("Hi {firstname}");
    expect(unknownPlaceholders("course_ready", ["Hi {firstname}", "{course}"])).toEqual(["firstname"]);
  });
});
