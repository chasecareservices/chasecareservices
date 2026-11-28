import { renderCopy, type Copy } from "@/lib/email/templates";
/**
 * The wording of alert emails. Kept free of server code so it can be unit tested.
 * Care alerts deliberately leave out health details: those stay in the dashboard.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function layout(heading: string, rows: [string, string][], button: { label: string; href: string }, note: string, intro = "") {
  const html = `<!doctype html><html><body style="margin:0;background:#f7f2fb;font-family:Arial,Helvetica,sans-serif;color:#1d1a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#3b0a5e;padding:18px 24px;color:#fff;font-weight:bold;letter-spacing:3px">CHASE <span style="color:#f89a00;font-weight:normal;letter-spacing:1px;font-size:13px">Care Services</span></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:20px;color:#3b0a5e">${esc(heading)}</h1>
${intro ? intro.split(/\n\s*\n/).map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${esc(p.trim())}</p>`).join("") : ""}
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px">
${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6475;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join("")}
</table>
<p style="margin:24px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#3b0a5e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">${esc(button.label)}</a></p>
<p style="margin:0;font-size:13px;color:#6b6475">${esc(note)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${intro ? `${intro.trim()}\n\n` : ""}${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${button.label}: ${button.href}\n\n${note}`;
  return { html, text };
}

export const ENQUIRY_LABELS: Record<string, string> = {
  contact: "General enquiry",
  care_request: "Care request",
  worker_application: "Job application",
  course_registration: "Course registration",
  parent_training: "Parent training",
  student_programme: "Student programme",
  respite: "Respite enquiry",
  partnership: "Partnership enquiry",
  forum_registration: "Forum registration",
};

export function enquiryAlert(
  e: { id: string; enquiry_type: string; full_name: string; email: string | null; phone: string | null; country: string | null; subject: string | null },
  siteUrl: string,
) {
  const kind = ENQUIRY_LABELS[e.enquiry_type] ?? "Enquiry";
  const rows: [string, string][] = [["Type", kind], ["Name", e.full_name]];
  if (e.phone) rows.push(["Phone", e.phone]);
  if (e.email) rows.push(["Email", e.email]);
  if (e.country) rows.push(["Country", e.country]);
  if (e.subject) rows.push(["Subject", e.subject]);
  const { html, text } = layout(
    `New ${kind.toLowerCase()} from ${e.full_name}`,
    rows,
    { label: "Open in the dashboard", href: `${siteUrl}/admin/enquiries/${e.id}` },
    "Sent automatically by the Chase Care website. The full message is in the dashboard.",
  );
  return { subject: `New ${kind.toLowerCase()}: ${e.full_name}`, html, text, replyTo: e.email ?? undefined };
}

export function careConcernAlert(
  r: { id: string; reference: string; concern_level: string; visit_date: string; client_name: string; worker_name: string },
  siteUrl: string,
) {
  const urgent = r.concern_level === "urgent";
  const { html, text } = layout(
    urgent ? `URGENT care concern: ${r.client_name}` : `Care concern to keep an eye on: ${r.client_name}`,
    [
      ["Report", r.reference],
      ["Client", r.client_name],
      ["Care worker", r.worker_name],
      ["Visit date", r.visit_date],
      ["Level", urgent ? "Urgent — act today" : "Keep an eye on it"],
    ],
    { label: "Read the report", href: `${siteUrl}/admin/care-reports/${r.id}` },
    "For privacy, the details of the concern are only in the dashboard. Sent automatically by the Chase Care website.",
  );
  return { subject: `${urgent ? "URGENT: " : ""}Care concern — ${r.client_name} (${r.reference})`, html, text };
}

export function incidentAlert(
  r: { id: string; reference: string; severity: string; kind: string; occurred_at: string; client_name: string; reporter_name: string },
  siteUrl: string,
) {
  const serious = r.severity === "serious";
  const { html, text } = layout(
    serious ? `SERIOUS incident: ${r.client_name}` : `New incident report: ${r.client_name}`,
    [
      ["Report", r.reference],
      ["Client", r.client_name],
      ["Reported by", r.reporter_name],
      ["When", new Date(r.occurred_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })],
      ["Type", r.kind],
      ["Severity", serious ? "Serious — act today" : r.severity === "moderate" ? "Moderate — needs follow-up" : "Minor"],
    ],
    { label: "Open the incident", href: `${siteUrl}/admin/incidents/${r.id}` },
    "For privacy, what happened is only in the dashboard. Sent automatically by the Chase Care website.",
  );
  return { subject: `${serious ? "SERIOUS: " : ""}Incident — ${r.client_name} (${r.reference})`, html, text };
}

/** To the wellbeing team: a care worker asked for support. Deliberately says nothing about who or why. */
export function wellbeingAlert(r: { id: string; reference: string; urgency: string }, siteUrl: string) {
  const urgent = r.urgency === "urgent";
  const { html, text } = layout(
    urgent ? "URGENT: a care worker has asked for wellbeing support" : "A care worker has asked for wellbeing support",
    [
      ["Request", r.reference],
      ["How soon", urgent ? "As soon as possible: today or tomorrow" : r.urgency === "soon" ? "In the next few days" : "When you can"],
    ],
    { label: "Open the request", href: `${siteUrl}/admin/wellbeing/${r.id}` },
    "This request is confidential. Who sent it and what it says are only in the dashboard. Sent automatically by the Chase Care website.",
  );
  return { subject: `${urgent ? "URGENT: " : ""}Wellbeing request ${r.reference}`, html, text };
}

/** To the care worker: the wellbeing team replied. The message itself stays in the portal. */
export function wellbeingReplyAlert(r: { id: string; reference: string; first_name: string }, siteUrl: string) {
  const { html, text } = layout(
    `Hello ${r.first_name}, you have a new message`,
    [["About", `Your wellbeing request ${r.reference}`]],
    { label: "Read it in your portal", href: `${siteUrl}/portal/wellbeing/${r.id}` },
    "For your privacy, the message is only in your care worker portal. Sent by the ChaseCare Wellbeing Hub.",
  );
  return { subject: "A new message from the ChaseCare Wellbeing Hub", html, text };
}

/** To someone who already has an account: they've been enrolled on an online course. */
export function enrolledAlert(p: { first_name: string; course_title: string }, siteUrl: string, copy?: Partial<Copy> | null) {
  const c = renderCopy("course_ready", copy, { first_name: p.first_name, course: p.course_title });
  const { html, text } = layout(
    c.heading,
    [["Course", p.course_title]],
    { label: "Start learning", href: `${siteUrl}/learn` },
    `${c.message} Sent by the ChaseCare Academy.`,
  );
  return { subject: c.subject, html, text };
}

const longDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const expiryWords = (d: string, today: string) => {
  const left = Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000);
  return left < 0 ? `expired on ${longDate(d)}` : left === 0 ? "expires today" : `expires on ${longDate(d)} (in ${left} ${left === 1 ? "day" : "days"})`;
};

/** To a care worker: a document needs renewing. */
export function credentialWorkerReminder(p: { first_name: string; items: { label: string; expires_on: string }[]; today: string }, siteUrl: string, copy?: Partial<Copy> | null) {
  const expired = p.items.some((i) => i.expires_on < p.today);
  const c = renderCopy(expired ? "document_expired" : "document_expiring", copy, { first_name: p.first_name });
  const { html, text } = layout(
    c.heading,
    p.items.map((i) => [i.label, expiryWords(i.expires_on, p.today)] as [string, string]),
    { label: "Send the new details", href: `${siteUrl}/portal/documents` },
    `${c.message} Sent by Chase Care Services.`,
  );
  return { subject: c.subject, html, text };
}

/** To the office: documents expiring or expired today's run found. */
export function credentialOfficeDigest(p: { items: { worker: string; label: string; expires_on: string }[]; to_check: number; today: string }, siteUrl: string) {
  const rows: [string, string][] = p.items.map((i) => [i.worker, `${i.label}: ${expiryWords(i.expires_on, p.today)}`]);
  if (p.to_check) rows.push(["Waiting to be checked", `${p.to_check} renewed ${p.to_check === 1 ? "document" : "documents"} sent by care workers`]);
  const { html, text } = layout(
    "Care worker documents need attention",
    rows,
    { label: "Open worker documents", href: `${siteUrl}/admin/worker-documents` },
    "The care workers listed have also been emailed a reminder. Sent automatically by the Chase Care website.",
  );
  return { subject: `Worker documents: ${p.items.length} expiring or expired`, html, text };
}

/** An announcement from the office, emailed to care workers and/or families. */
export function announcementEmail(p: { title: string; body: string; important: boolean; portal: "/portal" | "/family" }, siteUrl: string) {
  const { html, text } = layout(
    p.title,
    [],
    { label: "Open your portal", href: `${siteUrl}${p.portal}` },
    "You can also read this in your Chase Care portal. Sent by the Chase Care office.",
    p.body,
  );
  return { subject: `${p.important ? "Important: " : ""}${p.title}`, html, text };
}
