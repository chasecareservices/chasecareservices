import { renderCopy, type Copy } from "@/lib/email/templates";
/**
 * News & blog subscriptions: checks and email wording. No server code here, so
 * it can be unit tested. Every email carries a one-click unsubscribe link.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function cleanEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return email;
}

function frame(inner: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#f7f2fb;font-family:Arial,Helvetica,sans-serif;color:#1d1a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#3b0a5e;padding:18px 24px;color:#fff;font-weight:bold;letter-spacing:3px">CHASE <span style="color:#f89a00;font-weight:normal;letter-spacing:1px;font-size:13px">Care Services</span></td></tr>
<tr><td style="padding:24px">${inner}</td></tr>
<tr><td style="padding:16px 24px;background:#faf7fc;font-size:12px;color:#6b6475">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#f89a00;color:#1d0533;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">${esc(label)}</a></p>`;

/** "Please confirm" email sent when someone signs up. */
export function confirmEmail(siteUrl: string, token: string, name?: string | null, copy?: Partial<Copy> | null) {
  const c = renderCopy("newsletter_confirm", copy, {});
  const link = `${siteUrl}/newsletter/confirm/${token}`;
  const hello = name ? `Hello ${name},` : "Hello,";
  const html = frame(
    `<h1 style="margin:0 0 16px;font-size:20px;color:#3b0a5e">${esc(c.heading)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0;font-size:15px;line-height:1.5">${esc(c.message)}</p>
${button(link, "Yes, subscribe me")}
<p style="margin:0;font-size:13px;color:#6b6475">If you didn't ask for this, ignore this email and you won't hear from us.</p>`,
    "Chase Care Services · Ghana",
  );
  const text = `${hello}\n\n${c.message}\n${link}\n\nIf you didn't ask for this, ignore this email and you won't hear from us.`;
  return { subject: c.subject, html, text };
}

export type ArticleForEmail = { title: string; excerpt: string | null; url: string; imageUrl: string | null; category: string | null };

/** A new article, as sent to each subscriber with their own unsubscribe link. */
export function articleEmail(a: ArticleForEmail, unsubscribeUrl: string) {
  const html = frame(
    `${a.imageUrl ? `<img src="${esc(a.imageUrl)}" alt="" width="512" style="display:block;width:100%;max-width:512px;height:auto;border-radius:12px;margin:0 0 20px">` : ""}
${a.category ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b86e00;font-weight:bold">${esc(a.category)}</p>` : ""}
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#3b0a5e">${esc(a.title)}</h1>
${a.excerpt ? `<p style="margin:0;font-size:15px;line-height:1.6">${esc(a.excerpt)}</p>` : ""}
${button(a.url, "Read the article")}`,
    `You get this because you subscribed to news from Chase Care Services. <a href="${esc(unsubscribeUrl)}" style="color:#6b6475">Unsubscribe</a>`,
  );
  const text = `${a.title}\n\n${a.excerpt ?? ""}\n\nRead the article: ${a.url}\n\n—\nYou get this because you subscribed to news from Chase Care Services.\nUnsubscribe: ${unsubscribeUrl}`;
  return {
    subject: a.title,
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
