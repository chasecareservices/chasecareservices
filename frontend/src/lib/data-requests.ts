/** Data requests: labels and a plain summary of what is held. No server code: unit tested. */

export const REQUEST_KINDS = [
  { value: "access", label: "Copy of their data (access)" },
  { value: "erasure", label: "Delete their data (erasure)" },
  { value: "correction", label: "Correct their data" },
  { value: "objection", label: "Stop using their data (objection)" },
  { value: "other", label: "Other" },
] as const;
export const kindLabel = (v: string) => REQUEST_KINDS.find((k) => k.value === v)?.label ?? v;

export type PersonData = {
  enquiries: unknown[];
  newsletter: { status: string } | null;
  event_registrations: unknown[];
  job_applications: unknown[];
  account: null | {
    roles: string[];
    family_of: unknown[];
    courses: unknown[];
    certificates: unknown[];
    wellbeing_requests: unknown[];
    documents_and_checks: unknown[];
    care_records: { visit_reports_written: number; visits_booked: number; incident_reports_written: number };
  };
};

/** One line per kind of record held, e.g. "2 enquiries". */
export function summarise(d: PersonData): string[] {
  const n = (x: number, one: string, many = `${one}s`) => `${x} ${x === 1 ? one : many}`;
  const out: string[] = [];
  if (d.enquiries.length) out.push(n(d.enquiries.length, "website enquiry", "website enquiries"));
  if (d.newsletter) out.push(`Newsletter: ${d.newsletter.status}`);
  if (d.event_registrations.length) out.push(n(d.event_registrations.length, "event registration"));
  if (d.job_applications.length) out.push(n(d.job_applications.length, "job application"));
  if (d.account) {
    out.push(`An account (${d.account.roles.join(", ") || "no role"})`);
    if (d.account.family_of.length) out.push(n(d.account.family_of.length, "family portal link"));
    if (d.account.courses.length) out.push(n(d.account.courses.length, "course enrolment"));
    if (d.account.certificates.length) out.push(n(d.account.certificates.length, "certificate"));
    if (d.account.wellbeing_requests.length) out.push(n(d.account.wellbeing_requests.length, "wellbeing request"));
    if (d.account.documents_and_checks.length) out.push(n(d.account.documents_and_checks.length, "document record"));
    const c = d.account.care_records;
    if (c.visit_reports_written || c.visits_booked || c.incident_reports_written) out.push(`Care work: ${c.visits_booked} visits, ${c.visit_reports_written} reports, ${c.incident_reports_written} incident reports (kept)`);
  }
  return out;
}

/** Days until (negative: since) the due date. */
export const daysLeft = (due: string, today = new Date().toISOString().slice(0, 10)) => Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400_000);
