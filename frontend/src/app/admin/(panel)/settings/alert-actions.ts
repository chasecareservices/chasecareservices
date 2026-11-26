"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { ALERT_TOPICS } from "@/lib/email/notify";
import { sendEmail } from "@/lib/email/send";

type Result = { error: string } | undefined;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "a@x.com, b@y.com" or one per line → a clean list. */
function parse(text: string) {
  return [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export async function saveAlertRecipients(formData: FormData): Promise<Result> {
  const staff = await requirePermission("settings.edit");
  const lists = {
    [ALERT_TOPICS.enquiries]: parse(String(formData.get("enquiries") ?? "")),
    [ALERT_TOPICS.careConcerns]: parse(String(formData.get("care_concerns") ?? "")),
  };
  const bad = Object.values(lists).flat().find((e) => !EMAIL.test(e));
  if (bad) return { error: `“${bad}” doesn't look like an email address.` };
  if (Object.values(lists).some((l) => l.length > 20)) return { error: "Please list at most 20 addresses per alert." };

  const topics = Object.keys(lists);
  const { error: delError } = await staff.supabase.from("notification_recipients").delete().in("topic", topics);
  if (delError) return { error: "The alert emails could not be saved. Please try again." };
  const rows = Object.entries(lists).flatMap(([topic, emails]) => emails.map((email) => ({ topic, email })));
  if (rows.length) {
    const { error } = await staff.supabase.from("notification_recipients").insert(rows);
    if (error) return { error: "The alert emails could not be saved. Please try again." };
  }
  redirect("/admin/settings?saved=alerts#email-alerts");
}

/** What went wrong with a test email, in plain words. */
const TEST_FAILURES: Record<string, string> = {
  "not-configured": "Email isn't switched on yet. Add SMTP_USER and SMTP_PASS in Vercel, then redeploy.",
  "smtp-auth": "Gmail refused the sign-in. Check SMTP_USER is the full Gmail address and SMTP_PASS is the 16-letter App Password (not the normal password), then redeploy.",
  "smtp-connection": "The website couldn't reach the mail server. Try again in a minute.",
  "no-recipients": "Your account has no email address to send the test to.",
};

/** Sends a test email to the signed-in staff member, to check email sending works. */
export async function sendTestEmail(): Promise<Result> {
  const staff = await requirePermission("settings.edit");
  const to = staff.user.email;
  const result = await sendEmail({
    to: to ? [to] : [],
    subject: "Test email from the Chase Care website",
    text: "This is a test. If you can read this, the website can send email alerts.",
    html: "<p style=\"font-family:Arial,sans-serif\">This is a test. If you can read this, the website can send email alerts. ✓</p>",
  });
  if (!result.sent) return { error: TEST_FAILURES[result.reason ?? ""] ?? "The test email could not be sent. Please check the settings in Vercel and try again." };
  redirect(`/admin/settings?saved=test-email#email-alerts`);
}
