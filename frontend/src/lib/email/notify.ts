import "server-only";
import { headers } from "next/headers";
import { careConcernAlert, enquiryAlert } from "@/lib/email/alerts";
import { sendEmail } from "@/lib/email/send";
import { createSecretClient } from "@/lib/supabase/server-auth";

/** Topics in notification_recipients. */
export const ALERT_TOPICS = { enquiries: "enquiry.all", careConcerns: "care.concerns" } as const;

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

type Admin = NonNullable<ReturnType<typeof createSecretClient>>;

/** Who gets an alert: the recipients for these topics, or else the site's own email address. */
async function recipients(admin: Admin, topics: string[]) {
  const { data } = await admin.from("notification_recipients").select("email").in("topic", topics);
  const list = [...new Set((data ?? []).map((r) => r.email.toLowerCase()))];
  if (list.length) return list;
  const { data: s } = await admin.from("site_settings").select("email").maybeSingle();
  return s?.email ? [s.email] : [];
}

/**
 * Emails the office about a new enquiry, once. Only enquiries made in the last
 * 15 minutes that haven't been announced count, so this can't be used to send
 * repeat emails. Returns quietly if email isn't set up.
 */
export async function notifyEnquiry(id: string) {
  const admin = createSecretClient();
  if (!admin) return;
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: e } = await admin
    .from("enquiries")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .is("notified_at", null)
    .gt("created_at", since)
    .select("id, enquiry_type, full_name, email, phone, country, subject")
    .maybeSingle();
  if (!e) return;
  const to = await recipients(admin, [ALERT_TOPICS.enquiries, `enquiry.${e.enquiry_type}`]);
  await sendEmail({ to, ...enquiryAlert(e, await siteUrl()) });
}

/** Emails the office when a care report has a concern ("keep an eye on it" or urgent). */
export async function notifyCareConcern(reportId: string) {
  const admin = createSecretClient();
  if (!admin) return;
  const { data: r } = await admin
    .from("care_reports")
    .select("id, reference, concern_level, visit_date, client:care_clients(full_name, preferred_name), worker:profiles!care_reports_worker_id_fkey(full_name)")
    .eq("id", reportId)
    .maybeSingle();
  if (!r || r.concern_level === "none") return;
  const client = r.client as unknown as { full_name: string; preferred_name: string | null } | null;
  const worker = r.worker as unknown as { full_name: string | null } | null;
  const to = await recipients(admin, [ALERT_TOPICS.careConcerns]);
  await sendEmail({
    to,
    ...careConcernAlert(
      {
        id: r.id,
        reference: r.reference,
        concern_level: r.concern_level,
        visit_date: r.visit_date,
        client_name: client?.full_name ?? "a client",
        worker_name: worker?.full_name ?? "a care worker",
      },
      await siteUrl(),
    ),
  });
}
