import { describe, expect, it } from "vitest";
import { articleEmail, cleanEmail, confirmEmail } from "./newsletter";

describe("newsletter", () => {
  it("cleans and checks email addresses", () => {
    expect(cleanEmail("  Ama@Example.COM ")).toBe("ama@example.com");
    expect(cleanEmail("not an email")).toBeNull();
    expect(cleanEmail("a@b")).toBeNull();
  });

  it("asks people to confirm with a personal link", () => {
    const m = confirmEmail("https://chase.example", "tok-1", "Ama <script>");
    expect(m.text).toContain("https://chase.example/newsletter/confirm/tok-1");
    expect(m.html).toContain("Ama &lt;script&gt;");
  });

  it("sends articles with a one-click unsubscribe", () => {
    const m = articleEmail({ title: "Care & dignity", excerpt: null, url: "https://chase.example/journal/x", imageUrl: null, category: "Community" }, "https://chase.example/api/newsletter/unsubscribe/t");
    expect(m.html).toContain("Care &amp; dignity");
    expect(m.headers["List-Unsubscribe"]).toBe("<https://chase.example/api/newsletter/unsubscribe/t>");
    expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(m.text).toContain("Unsubscribe: https://chase.example/api/newsletter/unsubscribe/t");
  });
});
