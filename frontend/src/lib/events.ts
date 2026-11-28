/** Community events and the Monthly Forum: labels, dates and calendar files. No server code: unit tested. */

export const EVENT_KINDS = [
  { value: "forum", label: "Monthly Forum" },
  { value: "outreach", label: "Community outreach" },
  { value: "awareness", label: "Awareness programme" },
  { value: "school", label: "School programme" },
  { value: "health", label: "Health initiative" },
  { value: "volunteering", label: "Volunteering" },
  { value: "community", label: "Community event" },
] as const;

export const FORUM_TOPICS = [
  "Dementia",
  "Autism",
  "Disability",
  "Elderly care",
  "Parenting",
  "Caregiver wellbeing",
  "Mental health",
  "Safeguarding",
  "Inclusive communities",
  "Healthcare",
];

export const REGISTRATION_STATUS = [
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "Didn't come" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const eventKindLabel = (v: string) => EVENT_KINDS.find((k) => k.value === v)?.label ?? v;
export const registrationStatusLabel = (v: string) => REGISTRATION_STATUS.find((s) => s.value === v)?.label ?? v;
export const attendLabel = (v: string) => (v === "online" ? "Online" : "In person");

/** Ghana is on GMT all year, so times are shown in UTC. */
export function eventDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
export function eventTime(startIso: string, endIso?: string | null) {
  const t = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).replace(" ", "");
  return endIso ? `${t(startIso)} – ${t(endIso)}` : t(startIso);
}

/** Has it finished? Events without an end time count as two hours long. */
export function isOver(e: { starts_at: string; ends_at: string | null }, now = Date.now()) {
  return (e.ends_at ? Date.parse(e.ends_at) : Date.parse(e.starts_at) + 2 * 3600_000) < now;
}

/** "Welcome to the forum!" error codes from register_for_event, in plain words. */
export function registrationError(code: string | undefined, message: string | undefined): string {
  switch (code) {
    case "53400":
      return "Sorry, this event is full. You can still join online if that's offered, or choose another date.";
    case "55000":
      return "Registration for this event has closed.";
    case "P0002":
      return "This event isn't open for registration.";
    case "23505":
      return "You're already registered for this event with that email address.";
    case "22023":
    case "54000":
      return message ?? "Please check your details.";
    case "23514":
      return "Please check your email address and try again.";
    default:
      return "Sorry, something went wrong. Please try again, or call or WhatsApp us.";
  }
}

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** Lines longer than 75 octets must be folded (RFC 5545). */
const fold = (line: string) => line.match(/.{1,73}/g)!.join("\r\n ");

/** An .ics calendar file for one event. */
export function eventIcs(e: { id: string; title: string; summary: string | null; starts_at: string; ends_at: string | null; venue: string | null }, url: string, now = new Date()) {
  const end = e.ends_at ?? new Date(Date.parse(e.starts_at) + 2 * 3600_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chase Care Services//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@chasecareservices.org`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    ...(e.summary ? [`DESCRIPTION:${icsText(`${e.summary}\n\n${url}`)}`] : [`DESCRIPTION:${icsText(url)}`]),
    ...(e.venue ? [`LOCATION:${icsText(e.venue)}`] : []),
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}

/** URL-safe slug from a title and date, e.g. "awareness-walk-2026-12-05". */
export function eventSlug(title: string, startsAt: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
  return `${base || "event"}-${startsAt.slice(0, 10)}`;
}
