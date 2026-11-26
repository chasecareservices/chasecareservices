/**
 * Care visit reports: the choices a care worker picks from, and the rules a report
 * must meet. Shared by the care worker portal, the server actions and the dashboard,
 * so the words are the same everywhere (consistency) and the browser and server
 * check the same things.
 */

export type Option<T extends string = string> = { value: T; label: string; hint?: string; icon?: string };

export const MOODS: Option<"great" | "good" | "okay" | "low" | "distressed">[] = [
  { value: "great", label: "Great", icon: "😄", hint: "Cheerful and engaged" },
  { value: "good", label: "Good", icon: "🙂", hint: "Settled and comfortable" },
  { value: "okay", label: "Okay", icon: "😐", hint: "Quiet or a little tired" },
  { value: "low", label: "Low", icon: "🙁", hint: "Sad, unwell or withdrawn" },
  { value: "distressed", label: "Distressed", icon: "😣", hint: "Upset, in pain or confused" },
];

export const ACTIVITIES: Option[] = [
  { value: "personal_care", label: "Personal care", hint: "Washing, dressing, toileting" },
  { value: "meals", label: "Meals & drinks" },
  { value: "medication", label: "Medication prompt" },
  { value: "mobility", label: "Walking & exercises" },
  { value: "companionship", label: "Company & conversation" },
  { value: "outing", label: "Outing or appointment" },
  { value: "household", label: "Household tasks" },
  { value: "learning", label: "Homework & learning" },
  { value: "play", label: "Play & activities" },
  { value: "night_care", label: "Night care" },
];

export const MEALS: Option[] = [
  { value: "ate_well", label: "Ate well" },
  { value: "ate_some", label: "Ate some" },
  { value: "ate_little", label: "Ate very little" },
  { value: "refused", label: "Refused food" },
  { value: "not_applicable", label: "No meal on this visit" },
];

export const MEDICATION: Option[] = [
  { value: "as_prescribed", label: "Taken as prescribed" },
  { value: "partly", label: "Some taken, some not" },
  { value: "refused", label: "Refused" },
  { value: "missed", label: "Missed or not available" },
  { value: "not_due", label: "None due on this visit" },
  { value: "not_applicable", label: "Not part of their care" },
];

export const CONCERNS: Option<"none" | "monitor" | "urgent">[] = [
  { value: "none", label: "No concerns", hint: "Everything was as expected", icon: "✓" },
  { value: "monitor", label: "Keep an eye on it", hint: "Something small the office should know", icon: "!" },
  { value: "urgent", label: "Urgent", hint: "The office must act today", icon: "‼" },
];

export const labelOf = (options: Option[], value: string | null | undefined) =>
  options.find((o) => o.value === value)?.label ?? (value ? value.replace(/_/g, " ") : "—");

/* ---------- Visit location ---------- */

export type LocationStatus = "captured" | "denied" | "unavailable" | "not_supported";

/** The phone's location when the report was written, or why there isn't one. */
export type VisitLocation = {
  status: LocationStatus;
  lat?: number;
  lng?: number;
  /** How sure the phone is, in metres (smaller is better). */
  accuracy?: number;
  /** ISO time the phone took the reading. */
  captured_at?: string;
};

export const LOCATION_PROBLEMS: Record<Exclude<LocationStatus, "captured">, string> = {
  denied: "Location was blocked on the phone",
  unavailable: "The phone couldn't find its location",
  not_supported: "This phone or browser can't share location",
};

/** Straight-line distance in metres between two points (haversine). */
export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const formatDistance = (m: number) => (m < 1000 ? `${Math.max(5, Math.round(m / 5) * 5)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

/**
 * Was the worker at the client's home? Allows for the phone's own uncertainty:
 * within 150 m plus the reported accuracy (capped at 500 m) counts as "at the home".
 */
export function visitVerdict(
  loc: { status: string; lat: number | null; lng: number | null; accuracy: number | null },
  home: { lat: number | null; lng: number | null },
):
  | { kind: "no_location"; reason: string }
  | { kind: "no_home" }
  | { kind: "at_home" | "away"; distance: number } {
  if (loc.status !== "captured" || loc.lat == null || loc.lng == null)
    return { kind: "no_location", reason: LOCATION_PROBLEMS[loc.status as keyof typeof LOCATION_PROBLEMS] ?? "No location was recorded" };
  if (home.lat == null || home.lng == null) return { kind: "no_home" };
  const distance = distanceMetres({ lat: loc.lat, lng: loc.lng }, { lat: home.lat, lng: home.lng });
  const allowance = 150 + Math.min(loc.accuracy ?? 0, 350);
  return { kind: distance <= allowance ? "at_home" : "away", distance };
}

/** Reads coordinates from "5.6037, -0.1870" or a Google Maps link. */
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  const t = decodeURIComponent(text.trim());
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // place pin in a Maps URL
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // map centre in a Maps URL
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/, // plain "lat, lng"
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const mapsEmbed = (lat: number, lng: number) => `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;

/** The answers a care worker gives, as typed in the form. */
export type ReportInput = {
  client_id: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  mood: string;
  activities: string[];
  meals: string;
  medication: string;
  summary: string;
  concern_level: string;
  concerns: string;
  /** Only for new reports: the location is recorded once and can't be changed later. */
  location?: VisitLocation | null;
};

export const EMPTY_REPORT: ReportInput = {
  client_id: "",
  visit_date: "",
  start_time: "",
  end_time: "",
  mood: "",
  activities: [],
  meals: "",
  medication: "",
  summary: "",
  concern_level: "none",
  concerns: "",
};

export type ReportErrors = Partial<Record<keyof ReportInput, string>>;

/** The steps of the report form, and which answers belong to each. */
export const REPORT_STEPS: { title: string; fields: (keyof ReportInput)[] }[] = [
  { title: "The visit", fields: ["client_id", "location", "visit_date", "start_time", "end_time"] },
  { title: "How they were", fields: ["mood", "activities", "meals", "medication"] },
  { title: "Notes & concerns", fields: ["summary", "concern_level", "concerns"] },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const has = (options: Option[], value: string) => options.some((o) => o.value === value);

/** Today's date in Ghana (UTC all year), as YYYY-MM-DD. */
export const todayInGhana = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * Checks a report. Messages say what is wrong and how to fix it, in plain words.
 * Returns the cleaned answers when there are no errors.
 */
export function validateReport(
  input: ReportInput,
  today = todayInGhana(),
  { needLocation = false, now = Date.now() }: { needLocation?: boolean; now?: number } = {},
): { errors: ReportErrors; value: ReportInput | null } {
  const errors: ReportErrors = {};
  const v: ReportInput = {
    ...input,
    activities: [...new Set(input.activities.filter((a) => has(ACTIVITIES, a)))],
    summary: input.summary.trim(),
    concerns: input.concerns.trim(),
  };

  if (!v.client_id) errors.client_id = "Choose who you visited.";
  if (needLocation) {
    const loc = v.location;
    if (!loc) errors.location = "Share your location, or choose to send without it.";
    else if (loc.status === "captured") {
      const ok =
        typeof loc.lat === "number" && Math.abs(loc.lat) <= 90 &&
        typeof loc.lng === "number" && Math.abs(loc.lng) <= 180 &&
        !!loc.captured_at && !Number.isNaN(Date.parse(loc.captured_at)) &&
        Date.parse(loc.captured_at) <= now + 5 * 60_000 &&
        Date.parse(loc.captured_at) >= now - 24 * 3600_000;
      if (!ok) errors.location = "Your location reading didn't work. Tap “Share my location” again.";
    } else if (!(loc.status in LOCATION_PROBLEMS)) errors.location = "Share your location, or choose to send without it.";
  }
  if (!DATE_RE.test(v.visit_date)) errors.visit_date = "Enter the date of the visit.";
  else if (v.visit_date > today) errors.visit_date = "The visit date can't be in the future.";
  if (v.start_time && !TIME_RE.test(v.start_time)) errors.start_time = "Enter a time like 09:30.";
  if (v.end_time && !TIME_RE.test(v.end_time)) errors.end_time = "Enter a time like 13:00.";
  if (!errors.start_time && !errors.end_time && v.start_time && v.end_time && v.end_time <= v.start_time)
    errors.end_time = "The finish time must be after the start time.";

  if (!has(MOODS, v.mood)) errors.mood = "Choose how they seemed today.";
  if (v.meals && !has(MEALS, v.meals)) errors.meals = "Choose one of the meal options.";
  if (v.medication && !has(MEDICATION, v.medication)) errors.medication = "Choose one of the medication options.";

  if (v.summary.length < 10) errors.summary = "Write a few words about the visit (at least 10 characters).";
  else if (v.summary.length > 4000) errors.summary = "Please keep this under 4,000 characters.";
  if (!has(CONCERNS, v.concern_level)) errors.concern_level = "Choose whether you have any concerns.";
  else if (v.concern_level !== "none" && v.concerns.length < 5)
    errors.concerns = "Describe the concern so the office knows what to do.";
  if (v.concerns.length > 4000) errors.concerns = "Please keep this under 4,000 characters.";
  if (v.concern_level === "none") v.concerns = "";

  return { errors, value: Object.keys(errors).length ? null : v };
}

/** Which step holds the first error, so the form can take the worker straight there. */
export function stepWithFirstError(errors: ReportErrors): number {
  const i = REPORT_STEPS.findIndex((s) => s.fields.some((f) => errors[f]));
  return i === -1 ? 0 : i;
}

/** "09:00 – 13:00 (4 h)" */
export function visitTimes(start: string | null, end: string | null) {
  const s = start?.slice(0, 5);
  const e = end?.slice(0, 5);
  if (!s && !e) return "Times not given";
  if (s && e) {
    const mins = (Number(e.slice(0, 2)) * 60 + Number(e.slice(3))) - (Number(s.slice(0, 2)) * 60 + Number(s.slice(3)));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${s} – ${e} (${h ? `${h} h` : ""}${h && m ? " " : ""}${m ? `${m} min` : ""})`;
  }
  return s ? `From ${s}` : `Until ${e}`;
}
