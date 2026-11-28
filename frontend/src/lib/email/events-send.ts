import "server-only";
import { sendEmail } from "@/lib/email/send";
import { eventReminder, registrationConfirmation } from "@/lib/email/events";
import { siteUrl } from "@/lib/email/notify";
import { createSecretClient } from "@/lib/supabase/server-auth";

const EVENT_FIELDS = "id, slug, title, starts_at, ends_at, venue, topic";

/** Emails the confirmation once, for a registration made in the last 15 minutes. */
export async function sendRegistrationConfirmation(registrationId: string) {
  const admin = createSecretClient();
  if (!admin) return;
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: r } = await admin
    .from("event_registrations")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("id", registrationId)
    .is("confirmed_at", null)
    .gte("created_at", since)
    .select("full_name, email, attend_mode, token, event_id")
    .maybeSingle();
  if (!r?.email) return;
  const [{ data: event }, { data: link }] = await Promise.all([
    admin.from("community_events").select(EVENT_FIELDS).eq("id", r.event_id).single(),
    admin.from("community_event_links").select("online_url").eq("event_id", r.event_id).maybeSingle(),
  ]);
  if (!event) return;
  await sendEmail({ to: [r.email], ...registrationConfirmation({ event, registration: r, onlineUrl: link?.online_url ?? null }, await siteUrl()) });
}

/** Reminds everyone still registered (with an email address). Returns how many were sent. */
export async function sendEventReminders(eventId: string): Promise<{ sent: number; failed: number; noEmail: number; notConfigured?: boolean }> {
  const admin = createSecretClient();
  if (!admin) return { sent: 0, failed: 0, noEmail: 0 };
  const [{ data: event }, { data: link }, { data: regs }] = await Promise.all([
    admin.from("community_events").select(EVENT_FIELDS).eq("id", eventId).single(),
    admin.from("community_event_links").select("online_url").eq("event_id", eventId).maybeSingle(),
    admin.from("event_registrations").select("id, full_name, email, attend_mode, token").eq("event_id", eventId).eq("status", "registered"),
  ]);
  if (!event) return { sent: 0, failed: 0, noEmail: 0 };
  const site = await siteUrl();
  let sent = 0;
  let failed = 0;
  const withEmail = (regs ?? []).filter((r) => r.email);
  for (const r of withEmail) {
    const res = await sendEmail({ to: [r.email!], ...eventReminder({ event, registration: r, onlineUrl: link?.online_url ?? null }, site) });
    if (res.reason === "not-configured") return { sent: 0, failed: 0, noEmail: 0, notConfigured: true };
    if (res.sent) {
      sent++;
      await admin.from("event_registrations").update({ reminded_at: new Date().toISOString() }).eq("id", r.id);
    } else failed++;
  }
  return { sent, failed, noEmail: (regs ?? []).length - withEmail.length };
}
