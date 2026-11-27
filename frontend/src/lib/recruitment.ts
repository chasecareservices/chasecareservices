/** Recruitment pipeline: stages, checklist and roles. No server code: unit tested. */

export const STAGES = [
  { key: "registered", label: "Registered", help: "Applied. Check the application and invite them for an interview." },
  { key: "screening", label: "Screening", help: "Interview, ID, references and background check." },
  { key: "training", label: "Training & competency", help: "Safeguarding training and the competency assessment." },
  { key: "approved", label: "Approved", help: "All checks passed. Ready to be placed with a client." },
  { key: "placed", label: "Placed", help: "Working with clients." },
  { key: "support", label: "Ongoing support", help: "Supervision, refresher training and wellbeing." },
] as const;
export const CLOSED_STAGES = [
  { key: "rejected", label: "Not successful" },
  { key: "withdrawn", label: "Withdrew" },
] as const;
export type StageKey = (typeof STAGES)[number]["key"] | (typeof CLOSED_STAGES)[number]["key"];

export const stageLabel = (k: string) => [...STAGES, ...CLOSED_STAGES].find((s) => s.key === k)?.label ?? k;

/** Stages that need every required check first ("no placement without preparation"). */
export const LOCKED_STAGES = new Set(["approved", "placed", "support"]);

export const CHECK_GROUPS = [
  {
    title: "Screening",
    checks: [
      { key: "interview", label: "Interview", hint: "Met them and talked through the role" },
      { key: "id_verified", label: "ID checked", hint: "Ghana Card or passport seen" },
      { key: "references", label: "References", hint: "At least two, followed up" },
      { key: "background_check", label: "Background / police check", hint: "Mark “not needed” only if it doesn't apply", optional: true },
    ],
  },
  {
    title: "Training & competency",
    checks: [
      { key: "safeguarding_training", label: "Safeguarding training", hint: "Completed, or already certified", optional: true },
      { key: "comp_practical", label: "Practical care skills" },
      { key: "comp_communication", label: "Communication" },
      { key: "comp_conduct", label: "Professional conduct" },
      { key: "comp_dignity", label: "Client dignity" },
      { key: "comp_safeguarding", label: "Safeguarding awareness" },
      { key: "comp_documentation", label: "Care documentation" },
      { key: "comp_emergency", label: "Emergency procedures" },
    ],
  },
] as const;

export const ALL_CHECKS = CHECK_GROUPS.flatMap((g) => g.checks as readonly { key: string; label: string; hint?: string; optional?: boolean }[]);
export const checkLabel = (k: string) => ALL_CHECKS.find((c) => c.key === k)?.label ?? k;

export const CHECK_STATUS = [
  { value: "pending", label: "To do" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Didn't pass" },
  { value: "not_needed", label: "Not needed" },
] as const;

/** Checks still needed before Approved, with "not needed" allowed only where it may apply. */
export function missingChecks(statuses: Record<string, string | undefined>): string[] {
  return ALL_CHECKS.filter((c) => !(statuses[c.key] === "passed" || (c.optional && statuses[c.key] === "not_needed"))).map((c) => c.key);
}

export const ROLES = ["Caregiver", "Nurse", "Healthcare assistant", "Support worker (disability / autism)", "Nanny", "Housekeeper", "Therapist", "Other healthcare professional"];
export const AVAILABILITY = ["Full-time", "Part-time", "Weekends", "Nights", "Live-in", "Short-term / relief"];
