"use server";

import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/notify";
import { cleanEmail, confirmEmail } from "@/lib/newsletter";
import { createSecretClient } from "@/lib/supabase/server-auth";

export type SubscribeState = { ok?: boolean; message?: string } | undefined;

const RESEND_AFTER_MS = 10 * 60_000;
const DONE = "Nearly done! We've sent you an email. Click the link in it to confirm your subscription.";

/**
 * Signs someone up. They are only emailed articles after clicking the link in
 * the confirmation email, so nobody can subscribe another person. The answer is
 * the same whether or not the address was already on the list.
 */
export async function subscribe(_: SubscribeState, formData: FormData): Promise<SubscribeState> {
  if (String(formData.get("website") ?? "").trim()) return { ok: true, message: DONE }; // bots fill the hidden field
  const email = cleanEmail(String(formData.get("email") ?? ""));
  if (!email) return { message: "Please enter a valid email address, like name@example.com." };
  if (formData.get("consent") !== "on") return { message: "Please tick the box to say you'd like our emails." };
  const name = String(formData.get("full_name") ?? "").trim().slice(0, 120) || null;
  const source = String(formData.get("source") ?? "").slice(0, 300) || null;

  const db = createSecretClient();
  if (!db) return { message: "Sign-up isn't available right now. Please try again later." };

  // A flood of new sign-ups is almost certainly a bot.
  const { count } = await db
    .from("newsletter_subscribers")
    .select("id", { count: "exact", head: true })
    .gt("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) > 100) return { message: "Too many sign-ups right now. Please try again in an hour." };

  const { data: existing } = await db.from("newsletter_subscribers").select("id, status, token, confirm_sent_at").eq("email", email).maybeSingle();
  if (existing?.status === "subscribed") return { ok: true, message: DONE };
  if (existing?.confirm_sent_at && Date.now() - Date.parse(existing.confirm_sent_at) < RESEND_AFTER_MS) return { ok: true, message: DONE };

  let token = existing?.token;
  if (existing) {
    await db
      .from("newsletter_subscribers")
      .update({ status: "pending", full_name: name ?? undefined, consent_at: new Date().toISOString(), unsubscribed_at: null })
      .eq("id", existing.id);
  } else {
    const { data, error } = await db
      .from("newsletter_subscribers")
      .insert({ email, full_name: name, source_page: source })
      .select("token")
      .single();
    if (error || !data) return { message: "Something went wrong. Please try again." };
    token = data.token;
  }

  const sent = await sendEmail({ to: [email], ...confirmEmail(await siteUrl(), token!, name) });
  if (sent.sent) await db.from("newsletter_subscribers").update({ confirm_sent_at: new Date().toISOString() }).eq("email", email);
  return { ok: true, message: DONE };
}

/** Unsubscribes from the button on the unsubscribe page. */
export async function unsubscribe(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await unsubscribeByToken(token);
}

export async function unsubscribeByToken(token: string) {
  if (!/^[0-9a-f-]{36}$/.test(token)) return false;
  const db = createSecretClient();
  if (!db) return false;
  const { data } = await db
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("token", token)
    .neq("status", "unsubscribed")
    .select("id");
  return Boolean(data?.length);
}
