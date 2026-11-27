/** ChaseCare Wellbeing Hub: kinds of support, labels and request checks. No server code: unit tested. */

export const SUPPORT_KINDS = [
  { value: "counselling", label: "Counselling & emotional support", short: "Counselling", help: "Stress, grief, burnout, worry, or anything on your mind." },
  { value: "health", label: "Health services & referrals", short: "Health", help: "A health check, seeing a nurse or doctor, or advice." },
  { value: "laboratory", label: "Laboratory tests", short: "Laboratory", help: "A referral to a partner laboratory for tests." },
  { value: "insurance", label: "Insurance & benefits", short: "Insurance", help: "What your cover includes, or help with a claim." },
  { value: "other", label: "Something else", short: "Other", help: "Anything else about your wellbeing at work." },
] as const;
export type SupportKind = (typeof SUPPORT_KINDS)[number]["value"];

export const URGENCY = [
  { value: "routine", label: "When you can", help: "Within a week is fine" },
  { value: "soon", label: "In the next few days", help: "It's starting to affect me" },
  { value: "urgent", label: "As soon as possible", help: "Today or tomorrow, please" },
] as const;

export const CONTACT_METHODS = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In person" },
] as const;

export const REQUEST_STATUS = [
  { value: "new", label: "Sent", staffLabel: "New" },
  { value: "in_progress", label: "We're on it", staffLabel: "In progress" },
  { value: "referred", label: "Referred", staffLabel: "Referred to a service" },
  { value: "closed", label: "Closed", staffLabel: "Closed" },
] as const;

export const RESOURCE_KINDS = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "webinar", label: "Webinar" },
  { value: "support_session", label: "Support session" },
  { value: "leaflet", label: "Leaflet" },
  { value: "link", label: "Useful link" },
] as const;

const find = <T extends { value: string; label: string }>(list: readonly T[], v: string | null | undefined) => list.find((x) => x.value === v);
export const kindLabel = (v: string) => find(SUPPORT_KINDS, v)?.label ?? v;
export const kindShort = (v: string) => SUPPORT_KINDS.find((k) => k.value === v)?.short ?? v;
export const urgencyLabel = (v: string) => find(URGENCY, v)?.label ?? v;
export const contactLabel = (v: string) => find(CONTACT_METHODS, v)?.label ?? v;
export const statusLabel = (v: string, staff = false) => {
  const s = REQUEST_STATUS.find((x) => x.value === v);
  return s ? (staff ? s.staffLabel : s.label) : v;
};
export const resourceKindLabel = (v: string) => find(RESOURCE_KINDS, v)?.label ?? v;

/** Webinars and sessions still to come, soonest first; everything else after. */
export function splitResources<T extends { starts_at: string | null }>(rows: T[], now = Date.now()) {
  const upcoming = rows.filter((r) => r.starts_at && Date.parse(r.starts_at) >= now - 2 * 3600_000).sort((a, b) => Date.parse(a.starts_at!) - Date.parse(b.starts_at!));
  const library = rows.filter((r) => !r.starts_at);
  return { upcoming, library };
}

export type RequestInput = { kind: string; urgency: string; contact_method: string; contact_times: string | null; message: string };

export function validateRequest(input: RequestInput): { value: RequestInput } | { error: string } {
  const message = input.message.trim();
  if (!SUPPORT_KINDS.some((k) => k.value === input.kind)) return { error: "Choose the kind of support you'd like." };
  if (!URGENCY.some((u) => u.value === input.urgency)) return { error: "Choose how soon you'd like to hear from us." };
  if (!CONTACT_METHODS.some((c) => c.value === input.contact_method)) return { error: "Choose how we should contact you." };
  if (message.length < 2) return { error: "Tell us a little about what you need. A sentence is enough." };
  if (message.length > 4000) return { error: "Please keep your message under 4,000 characters." };
  const times = input.contact_times?.trim().slice(0, 200) || null;
  return { value: { ...input, message, contact_times: times } };
}
