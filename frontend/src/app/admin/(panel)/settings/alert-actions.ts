"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { ALERT_TOPICS } from "@/lib/email/notify";

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
