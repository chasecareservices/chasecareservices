/**
 * Chase Care invitation emails (instead of the generic Supabase one), so the
 * person can see who it is from and what to do. No server code: unit tested.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type InviteKind = "worker" | "family" | "learner";

export function inviteEmail(p: { kind: InviteKind; name: string; link: string; clientName?: string | null; officePhone?: string | null }) {
  const first = p.name.trim().split(/\s+/)[0] || "there";
  const worker = p.kind === "worker";
  const learner = p.kind === "learner";
  // For learners, clientName carries the course name.
  const subject = learner
    ? `Your ChaseCare Academy course: ${p.clientName ?? "online learning"}`
    : worker
      ? "Your Chase Care care worker account"
      : `Follow ${p.clientName ?? "your loved one"}'s care with Chase Care`;
  const intro = learner
    ? `The ChaseCare Academy has enrolled you on ${p.clientName ?? "an online course"}. You can study online at your own pace, on your phone or computer, and download your certificate when you finish.`
    : worker
      ? "The Chase Care office has set up your care worker account. You'll use it on your phone to see your visits and the care plans of the people you support, and to send a short report after each visit."
      : `The Chase Care office has invited you to the family portal, where you can see ${p.clientName ?? "your loved one"}'s booked visits, read visit reports and the care plan, and message the office.`;
  const steps = [
    "Tap the button below. It opens the Chase Care website.",
    "Choose a password (at least 10 characters, with capital and small letters and a number).",
    learner
      ? "You'll go straight to My learning, where your course is waiting. Bookmark it to come back."
      : worker
        ? "You'll go straight to your care worker portal. Save the page to your home screen."
        : "You'll go straight to the family portal. Bookmark it to come back.",
  ];
  const help = p.officePhone ? `Questions? Call the office on ${p.officePhone}.` : "Questions? Reply to this email.";

  const html = `<!doctype html><html><body style="margin:0;background:#f7f2fb;font-family:Arial,Helvetica,sans-serif;color:#1d1a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#3b0a5e;padding:18px 24px;color:#fff;font-weight:bold;letter-spacing:3px">CHASE <span style="color:#f89a00;font-weight:normal;letter-spacing:1px;font-size:13px">Care Services</span></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">
<h1 style="margin:0 0 14px;font-size:21px;color:#3b0a5e">${learner ? "Welcome to the ChaseCare Academy" : "Welcome to Chase Care"}, ${esc(first)}</h1>
<p style="margin:0 0 14px">${esc(intro)}</p>
<ol style="margin:0 0 6px;padding-left:20px">${steps.map((s) => `<li style="margin:0 0 6px">${esc(s)}</li>`).join("")}</ol>
<p style="margin:22px 0"><a href="${esc(p.link)}" style="display:inline-block;background:#f89a00;color:#1d0533;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:bold">Set up my account</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#6b6475">The button works once and expires in 24 hours. If it has expired, ask the office to send a new invitation.</p>
<p style="margin:0;font-size:13px;color:#6b6475">${esc(help)}</p>
</td></tr>
<tr><td style="padding:14px 24px;background:#faf7fc;font-size:12px;color:#6b6475">Chase Care Services · Ghana. If you weren't expecting this email, you can ignore it.</td></tr>
</table></td></tr></table></body></html>`;

  const text = `${learner ? "Welcome to the ChaseCare Academy" : "Welcome to Chase Care"}, ${first}\n\n${intro}\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nSet up my account: ${p.link}\n\nThe link works once and expires in 24 hours. If it has expired, ask the office to send a new invitation.\n${help}\n\nChase Care Services · Ghana. If you weren't expecting this email, you can ignore it.`;
  return { subject, html, text };
}
