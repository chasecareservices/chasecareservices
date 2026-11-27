/**
 * Care worker matching: which workers suit a visit, and why. No server code: unit tested.
 * The office always makes the final choice; this only ranks and explains.
 */

export const SKILLS = [
  { value: "elderly_care", label: "Elderly care", courses: ["health & social care", "elderly"] },
  { value: "dementia", label: "Dementia care", courses: ["dementia"] },
  { value: "personal_care", label: "Personal care (washing, dressing)", courses: ["health & social care", "person-centred"] },
  { value: "mobility", label: "Moving & handling", courses: ["manual handling", "moving and handling"] },
  { value: "medication", label: "Medication support", courses: ["medication"] },
  { value: "first_aid", label: "First aid", courses: ["first aid"] },
  { value: "autism", label: "Autism", courses: ["autism"] },
  { value: "disability", label: "Disability support", courses: ["disability"] },
  { value: "special_needs", label: "Special educational needs (SEN)", courses: ["sen", "special educational", "special needs"] },
  { value: "childcare", label: "Childcare / nanny", courses: ["childcare", "house help"] },
  { value: "nursing", label: "Nursing (registered nurse)", courses: [] },
  { value: "palliative", label: "End-of-life care", courses: ["palliative", "end of life"] },
  { value: "housekeeping", label: "Housekeeping & cooking", courses: ["house help"] },
] as const;

export const LANGUAGES = ["English", "Twi", "Ga", "Ewe", "Fante", "Dagbani", "Hausa", "Nzema", "French"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const TIME_OFF_KINDS = [
  { value: "leave", label: "Leave / holiday" },
  { value: "sick", label: "Sick" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
] as const;

export const skillLabel = (v: string) => SKILLS.find((s) => s.value === v)?.label ?? v;

/** ISO weekday (1 = Monday … 7 = Sunday) of a yyyy-mm-dd date. */
export function isoWeekday(date: string) {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

const toMin = (t: string) => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};
export const hhmm = (t: string) => t.slice(0, 5);

/** Straight-line distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Skills a worker has: those the office recorded, plus those shown by a ChaseCare Academy certificate. */
export function workerSkills(recorded: string[], certificateTitles: string[]) {
  const fromCerts = new Map<string, string>();
  for (const title of certificateTitles) {
    const t = title.toLowerCase();
    for (const s of SKILLS) if (s.courses.some((k) => t.includes(k)) && !fromCerts.has(s.value)) fromCerts.set(s.value, title);
  }
  return { all: new Set([...recorded, ...fromCerts.keys()]), certified: fromCerts };
}

export type Slot = { date: string; start: string; end: string };
export type MatchClient = { required_skills: string[]; preferred_gender: string | null; languages: string[]; lat: number | null; lng: number | null };
export type MatchWorker = {
  id: string;
  name: string;
  gender: string | null;
  skills: string[];
  certificates: string[];
  languages: string[];
  lat: number | null;
  lng: number | null;
  travel_km: number;
  max_hours_week: number | null;
  availability: { weekday: number; start_time: string; end_time: string }[];
  time_off: { starts_on: string; ends_on: string; kind: string }[];
  /** Their other visits that day (not cancelled). */
  visits_that_day: { start_time: string; end_time: string; client: string }[];
  /** Minutes already booked in the visit's week. */
  week_minutes: number;
  on_care_team: boolean;
};
export type Check = { ok: boolean | null; text: string };
export type Match = { worker: MatchWorker; score: number; blocked: boolean; checks: Check[] };

/** Ranks workers for a visit. Blocked (on leave or double-booked) go last; the office decides. */
export function rankWorkers(client: MatchClient, slot: Slot, workers: MatchWorker[]): Match[] {
  const day = isoWeekday(slot.date);
  const s = toMin(slot.start);
  const e = toMin(slot.end);
  const visitMin = e - s;

  const results = workers.map((w) => {
    const checks: Check[] = [];
    let score = 0;
    let blocked = false;

    // Leave and clashes: these block.
    const off = w.time_off.find((t) => t.starts_on <= slot.date && t.ends_on >= slot.date);
    if (off) {
      blocked = true;
      checks.push({ ok: false, text: `Off that day (${TIME_OFF_KINDS.find((k) => k.value === off.kind)?.label.toLowerCase() ?? off.kind})` });
    }
    const clash = w.visits_that_day.find((v) => toMin(v.start_time) < e && toMin(v.end_time) > s);
    if (clash) {
      blocked = true;
      checks.push({ ok: false, text: `Already booked ${hhmm(clash.start_time)}–${hhmm(clash.end_time)} with ${clash.client}` });
    }

    // Usual availability.
    const windows = w.availability.filter((a) => a.weekday === day);
    if (!w.availability.length) {
      checks.push({ ok: null, text: "Hasn't set their availability yet" });
    } else if (windows.some((a) => toMin(a.start_time) <= s && toMin(a.end_time) >= e)) {
      score += 30;
      const a = windows.find((x) => toMin(x.start_time) <= s && toMin(x.end_time) >= e)!;
      checks.push({ ok: true, text: `Usually free ${WEEKDAYS[day - 1]}s ${hhmm(a.start_time)}–${hhmm(a.end_time)}` });
    } else if (windows.some((a) => toMin(a.start_time) < e && toMin(a.end_time) > s)) {
      score += 8;
      checks.push({ ok: false, text: `Only partly free then (${windows.map((a) => `${hhmm(a.start_time)}–${hhmm(a.end_time)}`).join(", ")})` });
    } else {
      score -= 20;
      checks.push({ ok: false, text: windows.length ? `Usually free ${windows.map((a) => `${hhmm(a.start_time)}–${hhmm(a.end_time)}`).join(", ")} only` : `Doesn't usually work ${WEEKDAYS[day - 1]}s` });
    }

    // Skills (including Academy certificates).
    const { all, certified } = workerSkills(w.skills, w.certificates);
    for (const need of client.required_skills) {
      if (all.has(need)) {
        score += 15;
        const cert = certified.get(need);
        checks.push({ ok: true, text: cert ? `${skillLabel(need)}: ${cert} certificate` : skillLabel(need) });
      } else {
        score -= 12;
        checks.push({ ok: false, text: `No ${skillLabel(need).toLowerCase()} recorded` });
      }
    }

    // Preferences.
    if (client.preferred_gender) {
      if (w.gender === client.preferred_gender) {
        score += 10;
        checks.push({ ok: true, text: `${client.preferred_gender === "female" ? "Female" : "Male"} carer, as the client prefers` });
      } else if (w.gender) {
        score -= 25;
        checks.push({ ok: false, text: `The client prefers a ${client.preferred_gender} carer` });
      } else {
        checks.push({ ok: null, text: "Gender not recorded (the client has a preference)" });
      }
    }
    if (client.languages.length) {
      const shared = client.languages.filter((l) => w.languages.includes(l));
      if (shared.length) {
        score += 6;
        checks.push({ ok: true, text: `Speaks ${shared.join(", ")}` });
      } else {
        checks.push({ ok: false, text: `Doesn't speak ${client.languages.join(" or ")}` });
      }
    }

    // Distance.
    if (client.lat != null && client.lng != null && w.lat != null && w.lng != null) {
      const km = distanceKm({ lat: client.lat, lng: client.lng }, { lat: w.lat, lng: w.lng });
      const shown = km < 10 ? km.toFixed(1) : Math.round(km).toString();
      if (km <= w.travel_km) {
        score += km <= 5 ? 15 : km <= 15 ? 8 : 3;
        checks.push({ ok: true, text: `About ${shown} km away` });
      } else {
        score -= 10;
        checks.push({ ok: false, text: `About ${shown} km away (further than their ${w.travel_km} km)` });
      }
    } else {
      checks.push({ ok: null, text: "Distance unknown (add map pins for the client and worker)" });
    }

    // Continuity and workload.
    if (w.on_care_team) {
      score += 12;
      checks.push({ ok: true, text: "Already on this client's care team" });
    }
    const hours = (w.week_minutes + visitMin) / 60;
    if (w.max_hours_week != null && hours > w.max_hours_week) {
      score -= 15;
      checks.push({ ok: false, text: `Would work ${Math.round(hours)} h that week (wants at most ${w.max_hours_week} h)` });
    } else if (w.week_minutes) {
      checks.push({ ok: null, text: `${Math.round(w.week_minutes / 6) / 10} h already booked that week` });
    }

    return { worker: w, score, blocked, checks };
  });

  return results.sort((a, b) => Number(a.blocked) - Number(b.blocked) || b.score - a.score || a.worker.name.localeCompare(b.worker.name));
}

/** Monday and Sunday (yyyy-mm-dd) of the week containing a date. */
export function weekOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const mon = new Date(d.getTime() - (isoWeekday(date) - 1) * 86400_000);
  const sun = new Date(mon.getTime() + 6 * 86400_000);
  return { monday: mon.toISOString().slice(0, 10), sunday: sun.toISOString().slice(0, 10) };
}

/** Weekly availability form (day_N, from_N, to_N for N = 1..7) → rows, or an error. */
export function availabilityFromForm(get: (k: string) => string | null): { rows: { weekday: number; start_time: string; end_time: string }[] } | { error: string } {
  const rows: { weekday: number; start_time: string; end_time: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    if (get(`day_${d}`) !== "on") continue;
    const from = get(`from_${d}`) ?? "";
    const to = get(`to_${d}`) ?? "";
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) return { error: `Enter the times for ${WEEKDAYS[d - 1]}, like 08:00 and 16:00.` };
    if (to <= from) return { error: `On ${WEEKDAYS[d - 1]} the finish time must be after the start time.` };
    rows.push({ weekday: d, start_time: from, end_time: to });
  }
  return { rows };
}
