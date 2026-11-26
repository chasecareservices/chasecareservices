import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sends email. Never throws: an alert that cannot be sent must not stop a form
 * or report from being saved. With nothing configured it logs and does nothing.
 *
 * Option 1 — SMTP with nodemailer (e.g. the office Gmail account):
 *   SMTP_USER  the mailbox, e.g. chasecareinfo@gmail.com
 *   SMTP_PASS  for Gmail: an App Password (Google Account → Security → 2-Step
 *              Verification → App passwords), never the normal password
 *   SMTP_HOST  default smtp.gmail.com     SMTP_PORT  default 465 (SSL)
 * Option 2 — Resend (https://resend.com): RESEND_API_KEY.
 *
 * EMAIL_FROM  optional sender, e.g. "Chase Care Services <chasecareinfo@gmail.com>".
 * EMAIL_API_URL  only for tests: a stand-in for https://api.resend.com.
 */
export type Email = { to: string[]; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> };
export type SendResult = { sent: boolean; via?: "smtp" | "resend"; reason?: string };

/** Which way email is sent, if any (shown in Site settings). */
export function emailTransport(): "smtp" | "resend" | null {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

let smtp: Transporter | null = null;
function smtpTransport() {
  if (!smtp) {
    const port = Number(process.env.SMTP_PORT || 465);
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465, // 587 upgrades with STARTTLS
      requireTLS: port !== 465 && !process.env.SMTP_ALLOW_PLAIN, // SMTP_ALLOW_PLAIN only for local tests
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      // Defence in depth: never read local files or fetch URLs into a message.
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return smtp;
}

function sender() {
  return process.env.EMAIL_FROM || (process.env.SMTP_USER ? `Chase Care Services <${process.env.SMTP_USER}>` : "Chase Care Services <onboarding@resend.dev>");
}

export async function sendEmail(email: Email): Promise<SendResult> {
  const via = emailTransport();
  if (!via) {
    console.info(`[email] not sent (email isn't set up): ${email.subject}`);
    return { sent: false, reason: "not-configured" };
  }
  if (!email.to.length) return { sent: false, via, reason: "no-recipients" };

  if (via === "smtp") {
    try {
      await smtpTransport().sendMail({
        from: sender(),
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { replyTo: email.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
      });
      return { sent: true, via };
    } catch (e) {
      console.error("[email] SMTP send failed:", e instanceof Error ? e.message : e);
      return { sent: false, via, reason: "smtp-error" };
    }
  }

  try {
    const res = await fetch(`${process.env.EMAIL_API_URL ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender(),
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[email] Resend refused (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return { sent: false, via, reason: `http-${res.status}` };
    }
    return { sent: true, via };
  } catch (e) {
    console.error("[email] could not reach Resend:", e instanceof Error ? e.message : e);
    return { sent: false, via, reason: "network" };
  }
}
