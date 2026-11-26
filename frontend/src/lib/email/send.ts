import "server-only";

/**
 * Sends email through Resend (https://resend.com) using RESEND_API_KEY.
 * Never throws: an alert that cannot be sent must not stop a form or report
 * from being saved. Without a key it logs and does nothing.
 *
 * EMAIL_FROM  — the sender, e.g. "Chase Care Services <alerts@chasecareservices.org>"
 *               (that domain must be verified in Resend). Until then Resend's
 *               test sender is used, which can only email the Resend account's own address.
 * EMAIL_API_URL — only for tests: a stand-in for https://api.resend.com.
 */
export type Email = { to: string[]; subject: string; html: string; text: string; replyTo?: string };

export async function sendEmail(email: Email): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] not sent (RESEND_API_KEY not set): ${email.subject}`);
    return { sent: false, reason: "not-configured" };
  }
  if (!email.to.length) return { sent: false, reason: "no-recipients" };
  try {
    const res = await fetch(`${process.env.EMAIL_API_URL ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Chase Care Services <onboarding@resend.dev>",
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[email] Resend refused (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return { sent: false, reason: `http-${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] could not reach Resend:", e instanceof Error ? e.message : e);
    return { sent: false, reason: "network" };
  }
}
