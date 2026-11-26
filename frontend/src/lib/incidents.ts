/** Incident reports: the choices offered and the checks made before saving. */

export const INCIDENT_KINDS = [
  { value: "fall", label: "Fall", hint: "They fell or nearly fell" },
  { value: "injury", label: "Injury", hint: "Cut, bruise, burn or other hurt" },
  { value: "medication", label: "Medication problem", hint: "Missed, wrong or refused medicine" },
  { value: "health", label: "Sudden illness", hint: "Fainting, fit, breathing trouble" },
  { value: "behaviour", label: "Behaviour", hint: "Aggression, distress, wandering off" },
  { value: "safeguarding", label: "Safeguarding worry", hint: "You think they may be harmed or neglected" },
  { value: "property", label: "Damage or loss", hint: "Something broken, lost or missing" },
  { value: "near_miss", label: "Near miss", hint: "Nobody was hurt, but it could have happened" },
  { value: "other", label: "Something else", hint: "" },
] as const;

export const INCIDENT_SEVERITIES = [
  { value: "minor", label: "Minor", hint: "No real harm. The office should know." },
  { value: "moderate", label: "Moderate", hint: "Some harm or risk. Needs follow-up." },
  { value: "serious", label: "Serious", hint: "Hospital, police, or real harm. Call the office now too." },
] as const;

export const PEOPLE_TOLD = [
  { value: "family", label: "Family" },
  { value: "doctor", label: "Doctor or nurse" },
  { value: "ambulance", label: "Ambulance" },
  { value: "police", label: "Police" },
  { value: "manager", label: "Chase Care office (by phone)" },
] as const;

export const INCIDENT_STATUS: Record<string, string> = { open: "New", investigating: "Being followed up", closed: "Closed" };

const label = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;
export const kindLabel = (v: string) => label(INCIDENT_KINDS, v);
export const severityLabel = (v: string) => label(INCIDENT_SEVERITIES, v);
export const personLabel = (v: string) => label(PEOPLE_TOLD, v);

export type IncidentInput = {
  client_id: string;
  occurred_at: string; // "YYYY-MM-DDTHH:MM", Ghana time (UTC)
  place: string;
  kind: string;
  severity: string;
  what_happened: string;
  action_taken: string;
  people_told: string[];
  witnesses: string;
};

export type IncidentValue = Omit<IncidentInput, "occurred_at" | "place" | "witnesses"> & {
  occurred_at: string; // ISO
  place: string | null;
  witnesses: string | null;
};

/** Checks an incident report and tidies it. Returns the first problem in plain words. */
export function validateIncident(input: IncidentInput, now = Date.now()): { error: string } | { value: IncidentValue } {
  if (!/^[0-9a-f-]{36}$/.test(input.client_id)) return { error: "Choose who the incident happened to." };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.occurred_at)) return { error: "Enter the date and time it happened." };
  const when = Date.parse(`${input.occurred_at}:00Z`);
  if (Number.isNaN(when)) return { error: "Enter the date and time it happened." };
  if (when > now + 10 * 60_000) return { error: "The time it happened can't be in the future." };
  if (when < now - 30 * 86400_000) return { error: "For something older than 30 days, please call the office." };
  if (!INCIDENT_KINDS.some((k) => k.value === input.kind)) return { error: "Choose what kind of incident it was." };
  if (!INCIDENT_SEVERITIES.some((s) => s.value === input.severity)) return { error: "Choose how serious it was." };
  const what = input.what_happened.trim();
  if (what.length < 10) return { error: "Describe what happened in a sentence or two." };
  if (what.length > 4000) return { error: "Please keep the description under 4000 characters." };
  const action = input.action_taken.trim();
  if (action.length < 2) return { error: "Say what you did straight away (even “Nothing yet”)." };
  if (action.length > 4000) return { error: "Please keep “what you did” under 4000 characters." };
  return {
    value: {
      client_id: input.client_id,
      occurred_at: new Date(when).toISOString(),
      place: input.place.trim().slice(0, 200) || null,
      kind: input.kind,
      severity: input.severity,
      what_happened: what,
      action_taken: action,
      people_told: [...new Set(input.people_told)].filter((p) => PEOPLE_TOLD.some((x) => x.value === p)),
      witnesses: input.witnesses.trim().slice(0, 500) || null,
    },
  };
}

/** "Thu 26 Nov, 10:30" in Ghana time. */
export function formatIncidentTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}
