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
  { title: "The visit", fields: ["client_id", "visit_date", "start_time", "end_time"] },
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
export function validateReport(input: ReportInput, today = todayInGhana()): { errors: ReportErrors; value: ReportInput | null } {
  const errors: ReportErrors = {};
  const v: ReportInput = {
    ...input,
    activities: [...new Set(input.activities.filter((a) => has(ACTIVITIES, a)))],
    summary: input.summary.trim(),
    concerns: input.concerns.trim(),
  };

  if (!v.client_id) errors.client_id = "Choose who you visited.";
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
