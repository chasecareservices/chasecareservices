import { describe, expect, it } from "vitest";
import { inviteEmail } from "./invite";

describe("invitation emails", () => {
  it("tells a care worker what the account is for", () => {
    const m = inviteEmail({ kind: "worker", name: "Ama Mensah", link: "https://chase.example/x?token=1&type=invite", officePhone: "+233 30 000 0000" });
    expect(m.subject).toBe("Your Chase Care care worker account");
    expect(m.html).toContain("Welcome to Chase Care, Ama");
    expect(m.html).toContain("https://chase.example/x?token=1&amp;type=invite");
    expect(m.text).toContain("Call the office on +233 30 000 0000");
  });

  it("names the loved one for families and escapes names", () => {
    const m = inviteEmail({ kind: "family", name: "<b>Efua</b> Boateng", link: "https://chase.example/y", clientName: "Auntie Akosua" });
    expect(m.subject).toBe("Follow Auntie Akosua's care with Chase Care");
    expect(m.html).toContain("&lt;b&gt;Efua&lt;/b&gt;");
    expect(m.text).toContain("Reply to this email");
  });
});

describe("learner invitation", () => {
  it("names the course and sends them to My learning", async () => {
    const { inviteEmail } = await import("./invite");
    const e = inviteEmail({ kind: "learner", name: "Abena Owusu", link: "https://x.test/l", clientName: "Dementia Care" });
    expect(e.subject).toBe("Your ChaseCare Academy course: Dementia Care");
    expect(e.text).toContain("Welcome to the ChaseCare Academy, Abena");
    expect(e.text).toContain("My learning");
  });
});
