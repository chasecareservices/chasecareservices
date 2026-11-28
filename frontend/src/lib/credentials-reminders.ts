import "server-only";
import { getEmailCopy } from "@/lib/email/copy";
import { compliance, docLabel, reminderDue, type Credential } from "@/lib/credentials";
import { credentialOfficeDigest, credentialWorkerReminder } from "@/lib/email/alerts";
import { ALERT_TOPICS, recipients } from "@/lib/email/notify";
import { sendEmail } from "@/lib/email/send";
import { createSecretClient } from "@/lib/supabase/server-auth";

export type ReminderRun = { workersEmailed: number; documents: number; officeEmailed: boolean; skipped?: "not-configured" | "no-key" };

/**
 * Finds verified documents that reached 30 days, 7 days or expiry since the last run, emails each
 * care worker once per stage, and sends the office one summary. Safe to run as often as you like.
 */
export async function runCredentialReminders(site: string, today = new Date().toISOString().slice(0, 10)): Promise<ReminderRun> {
  const admin = createSecretClient();
  if (!admin) return { workersEmailed: 0, documents: 0, officeEmailed: false, skipped: "no-key" };
  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + 30 * 86400_000).toISOString().slice(0, 10);
  const [{ data: due }, { data: pending }, { data: roles }] = await Promise.all([
    admin.from("worker_credentials").select("*").eq("status", "verified").not("expires_on", "is", null).lte("expires_on", horizon).lt("reminder_stage", 3),
    admin.from("worker_credentials").select("id").eq("status", "pending"),
    admin.from("user_roles").select("user_id").eq("role_key", "worker"),
  ]);
  const workerIds = (roles ?? []).map((r) => r.user_id);
  const { data: people } = workerIds.length ? await admin.from("profiles").select("id, full_name, is_active").in("id", workerIds).eq("is_active", true) : { data: [] };
  const active = new Map((people ?? []).map((p) => [p.id, p]));
  const ids = [...new Set((due ?? []).map((c) => c.worker_id))].filter((id) => active.has(id));
  if (!ids.length && !(pending ?? []).length) return { workersEmailed: 0, documents: 0, officeEmailed: false };

  // Only the newest verified document of each type counts (a renewed one replaces the old).
  const { data: all } = ids.length ? await admin.from("worker_credentials").select("*").in("worker_id", ids) : { data: [] };
  const digest: { worker: string; label: string; expires_on: string }[] = [];
  const [copyExpiring, copyExpired] = await Promise.all([getEmailCopy("document_expiring"), getEmailCopy("document_expired")]);
  let workersEmailed = 0;
  let notConfigured = false;
  for (const id of ids) {
    const rows = compliance((all ?? []).filter((c) => c.worker_id === id) as Credential[], [], today);
    const items: { id: string; stage: number; label: string; expires_on: string; renewalSent: boolean }[] = [];
    for (const r of rows) {
      const cur = r.current;
      if (!cur || cur.status !== "verified" || !cur.expires_on) continue;
      const raw = (due ?? []).find((d) => d.id === cur.id);
      if (!raw) continue;
      const stage = reminderDue(cur.expires_on, raw.reminder_stage, today);
      if (stage) items.push({ id: cur.id, stage, label: docLabel(cur.doc_type, cur.title), expires_on: cur.expires_on, renewalSent: !!r.pending });
    }
    if (!items.length) continue;
    const name = active.get(id)?.full_name ?? "Care worker";
    digest.push(...items.map((i) => ({ worker: name, label: `${i.label}${i.renewalSent ? " (renewal sent: check it)" : ""}`, expires_on: i.expires_on })));
    const { data: user } = await admin.auth.admin.getUserById(id);
    const email = user?.user?.email;
    // Don't remind someone about a document they've already sent the renewal for.
    const toRemind = items.filter((i) => !i.renewalSent);
    if (email && toRemind.length) {
      const first = name.replace(/\s*\(.*\)$/, "").split(/\s+/)[0];
      const res = await sendEmail({ to: [email], ...credentialWorkerReminder({ first_name: first, items: toRemind, today }, site, toRemind.some((i) => i.expires_on < today) ? copyExpired : copyExpiring) });
      if (res.reason === "not-configured") notConfigured = true;
      if (res.sent) workersEmailed++;
    }
    if (!notConfigured) {
      for (const i of items) await admin.from("worker_credentials").update({ reminder_stage: i.stage }).eq("id", i.id);
    }
  }
  if (notConfigured) return { workersEmailed: 0, documents: digest.length, officeEmailed: false, skipped: "not-configured" };
  let officeEmailed = false;
  if (digest.length) {
    const to = await recipients(admin, [ALERT_TOPICS.documents]);
    if (to.length) officeEmailed = (await sendEmail({ to, ...credentialOfficeDigest({ items: digest, to_check: (pending ?? []).length, today }, site) })).sent;
  }
  return { workersEmailed, documents: digest.length, officeEmailed };
}
