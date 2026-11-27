/** Care worker documents & checks: types, what's required, and status. No server code: unit tested. */

export const DOC_TYPES = [
  { value: "ghana_card", label: "Ghana Card", required: true, hint: "Or passport for non-Ghanaians" },
  { value: "police_check", label: "Police check", required: true, hint: "Police report / criminal record check" },
  { value: "first_aid", label: "First aid certificate", required: true, hint: "" },
  { value: "safeguarding", label: "Safeguarding training", required: true, hint: "" },
  { value: "health_check", label: "Health check (medical fitness)", required: true, hint: "" },
  { value: "nursing_licence", label: "Nursing licence (N&MC)", required: false, hint: "Required for nurses" },
  { value: "passport", label: "Passport", required: false, hint: "" },
  { value: "driving_licence", label: "Driving licence", required: false, hint: "" },
  { value: "other", label: "Other", required: false, hint: "" },
] as const;

export const docLabel = (v: string, title?: string | null) => (v === "other" && title ? title : (DOC_TYPES.find((d) => d.value === v)?.label ?? v));

export type Credential = {
  id: string;
  doc_type: string;
  title: string | null;
  reference: string | null;
  issued_on: string | null;
  expires_on: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

export type DocState = "valid" | "expiring" | "expired" | "pending" | "missing" | "rejected";
export type DocRow = { type: string; label: string; required: boolean; state: DocState; current: Credential | null; pending: Credential | null; daysLeft: number | null };

const day = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const daysBetween = (from: string, to: string) => Math.round((day(to) - day(from)) / 86400_000);

/** Which document types this worker must have. A Ghana Card or a passport both count as ID. */
export function requiredTypes(skills: string[]) {
  return [...DOC_TYPES.filter((d) => d.required).map((d) => d.value as string), ...(skills.includes("nursing") ? ["nursing_licence"] : [])];
}

/** Status of each required type (plus any other types they have), worst first. */
export function compliance(creds: Credential[], skills: string[], today: string, warnDays = 30): DocRow[] {
  const required = requiredTypes(skills);
  const types = [...new Set([...required, ...creds.map((c) => c.doc_type)])];
  const rows = types.map((type): DocRow => {
    // A passport stands in for a Ghana Card.
    const accept = type === "ghana_card" ? ["ghana_card", "passport"] : [type];
    const mine = creds.filter((c) => accept.includes(c.doc_type));
    const verified = mine
      .filter((c) => c.status === "verified")
      .sort((a, b) => (b.expires_on ?? "9999") .localeCompare(a.expires_on ?? "9999"))[0];
    const pending = mine.filter((c) => c.status === "pending").sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    const rejected = mine.filter((c) => c.status === "rejected").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const base = { type, label: docLabel(type, mine[0]?.title), required: required.includes(type), pending };
    if (verified) {
      if (!verified.expires_on) return { ...base, state: "valid", current: verified, daysLeft: null };
      const left = daysBetween(today, verified.expires_on);
      return { ...base, state: left < 0 ? "expired" : left <= warnDays ? "expiring" : "valid", current: verified, daysLeft: left };
    }
    if (pending) return { ...base, state: "pending", current: null, daysLeft: null };
    if (rejected) return { ...base, state: "rejected", current: rejected, daysLeft: null };
    return { ...base, state: "missing", current: null, daysLeft: null };
  });
  // The passport row is folded into ID when it's only standing in for a Ghana Card.
  const filtered = rows.filter((r) => !(r.type === "passport" && rows.some((x) => x.type === "ghana_card" && x.current?.doc_type === "passport")));
  const order: Record<DocState, number> = { expired: 0, missing: 1, rejected: 2, pending: 3, expiring: 4, valid: 5 };
  return filtered.sort((a, b) => Number(b.required) - Number(a.required) || order[a.state] - order[b.state]);
}

/** One word for the worker overall: what the office needs to do. */
export function overall(rows: DocRow[]): { level: "ok" | "attention" | "problem"; text: string } {
  const req = rows.filter((r) => r.required);
  const bad = req.filter((r) => r.state === "expired" || r.state === "missing" || r.state === "rejected");
  if (bad.length) return { level: "problem", text: `${bad.length} required ${bad.length === 1 ? "document" : "documents"} expired or missing` };
  const soon = rows.filter((r) => r.state === "expiring" || r.state === "pending");
  if (soon.length) return { level: "attention", text: soon.some((r) => r.state === "pending") ? "Details waiting to be checked" : "Expiring soon" };
  return { level: "ok", text: "All in order" };
}

export function stateText(r: DocRow) {
  const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  switch (r.state) {
    case "valid":
      return r.current?.expires_on ? `Valid until ${fmt(r.current.expires_on)}` : "Valid (doesn't expire)";
    case "expiring":
      return r.daysLeft === 0 ? "Expires today" : `Expires in ${r.daysLeft} ${r.daysLeft === 1 ? "day" : "days"} (${fmt(r.current!.expires_on!)})`;
    case "expired":
      return `Expired ${fmt(r.current!.expires_on!)}`;
    case "pending":
      return "New details sent: waiting to be checked";
    case "rejected":
      return "Not accepted: please send it again";
    default:
      return "Missing";
  }
}

/** Which reminder is due for a verified document (1 = 30 days, 2 = 7 days, 3 = expired), if any beyond those already sent. */
export function reminderDue(expiresOn: string, alreadySent: number, today: string): 0 | 1 | 2 | 3 {
  const left = daysBetween(today, expiresOn);
  const stage = left < 0 ? 3 : left <= 7 ? 2 : left <= 30 ? 1 : 0;
  return stage > alreadySent ? (stage as 1 | 2 | 3) : 0;
}

/** stateText with a small first letter, for use inside a sentence ("expired 12 Nov 2026"). */
export const stateInline = (r: DocRow) => {
  const t = stateText(r);
  return t.charAt(0).toLowerCase() + t.slice(1);
};
