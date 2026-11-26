import { describe, expect, it } from "vitest";
import { getResource } from "./resources";
import { fieldValue, friendlyDbError, readFields, toIso, toLocalInput } from "./values";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  Object.entries(entries).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("readFields", () => {
  const services = getResource("services")!;

  it("reads text, lists, numbers, checkboxes and makes a slug from the name", () => {
    const { values, error } = readFields(
      services,
      form({ name: "Night Care", service_group: "care", status: "published", includes: "Overnight support\n\n Bathroom help ", sort_order: "5" }),
    );
    expect(error).toBeUndefined();
    expect(values).toMatchObject({ name: "Night Care", slug: "night-care", includes: ["Overnight support", "Bathroom help"], sort_order: 5 });
  });

  it("reports missing required fields and bad numbers", () => {
    expect(readFields(services, form({ service_group: "care", status: "draft" })).error).toMatch(/Name is required|Web address/);
    expect(readFields(getResource("courses")!, form({ title: "X", status: "draft", audience: "general", delivery_mode: "online", certification_type: "internal", fee_amount: "abc" })).error).toMatch(/Fee must be a number/);
  });

  it("turns page text into content blocks and keeps preserved blocks", () => {
    const { values } = readFields(
      getResource("pages")!,
      form({ title: "Wellbeing", status: "draft", body: "## Hello\n\nText", body__preserved: '[{"type":"image","data":{"path":"x.jpg"}}]' }),
    );
    expect(values.body).toEqual([
      { type: "heading", data: { text: "Hello" } },
      { type: "paragraph", data: { text: "Text" } },
      { type: "image", data: { path: "x.jpg" } },
    ]);
  });

  it("rejects web links without https", () => {
    expect(readFields(getResource("partners")!, form({ name: "Lab", partner_type: "laboratory", status: "draft", website_url: "javascript:alert(1)" })).error).toMatch(/https/);
  });
});

describe("dates", () => {
  it("treats form times as Ghana time (UTC) and round-trips", () => {
    expect(toIso("2026-12-01T09:30")).toBe("2026-12-01T09:30:00.000Z");
    expect(toLocalInput("2026-12-01T09:30:00+00:00")).toBe("2026-12-01T09:30");
    expect(toIso("nonsense")).toBeNull();
  });
});

describe("fieldValue", () => {
  it("formats lists and tags for editing", () => {
    expect(fieldValue({ name: "x", label: "x", type: "lines" }, ["a", "b"])).toBe("a\nb");
    expect(fieldValue({ name: "x", label: "x", type: "tags" }, ["a", "b"])).toBe("a, b");
  });
});

describe("friendlyDbError", () => {
  it("explains database rules in plain words", () => {
    expect(friendlyDbError({ code: "23505", message: "duplicate key" })).toMatch(/already used/);
    expect(friendlyDbError({ code: "23514", message: 'violates check constraint "testimonials_publish_needs_consent"' })).toMatch(/consent/);
    expect(friendlyDbError(null)).toBeNull();
  });
});
