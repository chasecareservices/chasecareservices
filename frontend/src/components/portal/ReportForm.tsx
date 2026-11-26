"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { submitReport, updateReport, type SaveResult } from "@/app/portal/actions";
import { LocationCapture } from "@/components/portal/LocationCapture";
import {
  ACTIVITIES,
  CONCERNS,
  LOCATION_PROBLEMS,
  MEALS,
  MEDICATION,
  MOODS,
  REPORT_STEPS,
  labelOf,
  stepWithFirstError,
  todayInGhana,
  validateReport,
  visitTimes,
  type Option,
  type ReportErrors,
  type ReportInput,
} from "@/lib/care";

type Client = { id: string; name: string; fullName: string };

const REVIEW = REPORT_STEPS.length; // the last screen: check and send
const TOTAL = REPORT_STEPS.length + 1;

const nowHHMM = () => {
  const d = new Date();
  const m = Math.floor(d.getUTCMinutes() / 5) * 5; // Ghana is on UTC
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

function readDraft(key: string): { saved: number; values: ReportInput } | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, values: ReportInput | null) {
  try {
    if (values) window.localStorage.setItem(key, JSON.stringify({ saved: Date.now(), values }));
    else window.localStorage.removeItem(key);
  } catch {
    /* private browsing or storage full: the form still works, it just won't remember */
  }
}

/* ---------- Small building blocks ---------- */

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-base font-semibold text-red-700">
      <span aria-hidden="true">⚠</span> {message}
    </p>
  );
}

/** A group of large tappable choices (radio or checkbox) with a visible legend. */
function Choices({
  name,
  legend,
  hint,
  options,
  type,
  value,
  onChange,
  error,
  columns = 1,
  optional = false,
}: {
  name: keyof ReportInput;
  legend: string;
  hint?: string;
  options: Option[];
  type: "radio" | "checkbox";
  value: string | string[];
  onChange: (next: string | string[]) => void;
  error?: string;
  columns?: 1 | 2;
  optional?: boolean;
}) {
  const selected = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} aria-invalid={error ? true : undefined} data-field={name}>
      <legend className="text-lg font-bold text-brand-900">
        {legend} {optional && <span className="text-base font-normal text-muted">(optional)</span>}
      </legend>
      {hint && <p className="mt-0.5 text-muted">{hint}</p>}
      <div className={`mt-3 grid gap-2.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {options.map((o) => {
          const on = selected(o.value);
          return (
            <label
              key={o.value}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-300 ${
                on ? "border-brand-700 bg-brand-50" : "border-brand-100 bg-white hover:border-brand-300"
              }`}
            >
              <input
                type={type}
                name={name}
                value={o.value}
                checked={on}
                onChange={() => {
                  if (type === "radio") onChange(o.value);
                  else {
                    const list = Array.isArray(value) ? value : [];
                    onChange(on ? list.filter((x) => x !== o.value) : [...list, o.value]);
                  }
                }}
                className="sr-only"
              />
              {o.icon && (
                <span aria-hidden="true" className="text-2xl leading-none">
                  {o.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-brand-900">{o.label}</span>
                {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 text-sm font-bold ${type === "radio" ? "rounded-full" : "rounded-md"} ${
                  on ? "border-brand-700 bg-brand-700 text-white" : "border-brand-200"
                }`}
              >
                {on ? "✓" : ""}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  );
}

function TextField({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: keyof ReportInput;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div data-field={name}>
      <label htmlFor={name} className="block text-lg font-bold text-brand-900">
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="mt-0.5 text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

const inputClass = (error?: string) =>
  `block min-h-12 w-full rounded-xl border-2 bg-white px-4 py-3 text-lg text-ink focus:outline-none focus:ring-4 focus:ring-brand-200 ${
    error ? "border-red-600" : "border-brand-200 focus:border-brand-600"
  }`;

/* ---------- The form ---------- */

export function ReportForm({
  clients,
  initial,
  reportId,
  officePhone,
}: {
  clients: Client[];
  initial: ReportInput;
  /** When set, the form corrects an existing report instead of sending a new one. */
  reportId?: string;
  officePhone?: string | null;
}) {
  const draftKey = `chasecare:report-draft:${reportId ?? "new"}`;
  const [values, setValues] = useState<ReportInput>(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<ReportErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ saved: number; values: ReportInput } | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const touched = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";

  // Offer to continue an unfinished report (interruptions happen: a call, a flat battery).
  useEffect(() => {
    const d = readDraft(draftKey);
    if (d && JSON.stringify(d.values) !== JSON.stringify(initial)) setDraft(d);
  }, [draftKey, initial]);

  // Save the answers on this phone as they are typed.
  useEffect(() => {
    if (!touched.current) return;
    const t = window.setTimeout(() => {
      writeDraft(draftKey, values);
      setSavedAt(Date.now());
    }, 600);
    return () => window.clearTimeout(t);
  }, [values, draftKey]);

  // Move focus to the step heading so screen readers announce where they are.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function set<K extends keyof ReportInput>(key: K, value: ReportInput[K]) {
    touched.current = true;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function focusFirstError(errs: ReportErrors) {
    requestAnimationFrame(() => {
      const first = document.querySelector<HTMLElement>(
        REPORT_STEPS.flatMap((s) => s.fields)
          .filter((f) => errs[f])
          .map((f) => `[data-field="${f}"]`)
          .join(","),
      );
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      (first?.querySelector("input, textarea, select") as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }

  const needLocation = !reportId;

  function next() {
    const { errors: all } = validateReport(values, undefined, { needLocation });
    const here = Object.fromEntries(REPORT_STEPS[step].fields.filter((f) => all[f]).map((f) => [f, all[f]])) as ReportErrors;
    if (Object.keys(here).length) {
      setErrors(here);
      focusFirstError(here);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, REVIEW));
    window.scrollTo({ top: 0 });
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0 });
  }

  function send() {
    const { errors: all } = validateReport(values, undefined, { needLocation });
    if (Object.keys(all).length) {
      setErrors(all);
      setStep(stepWithFirstError(all));
      focusFirstError(all);
      return;
    }
    setMessage(null);
    start(async () => {
      writeDraft(draftKey, null);
      const result: SaveResult = reportId ? await updateReport(reportId, values) : await submitReport(values);
      if (result?.errors || result?.message) {
        writeDraft(draftKey, values); // keep their work
        if (result.errors) {
          setErrors(result.errors);
          setStep(stepWithFirstError(result.errors));
        }
        setMessage(result.message ?? "Please check the answers marked below.");
      }
    });
  }

  const title = step === REVIEW ? "Check and send" : REPORT_STEPS[step].title;
  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div>
      {/* Progress: where am I, and how much is left? */}
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">
          Step {step + 1} of {TOTAL}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl font-bold text-brand-900 focus:outline-none">
          {title}
        </h1>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <ol className="mt-2 flex justify-between text-xs font-semibold text-muted" aria-label="Report steps">
          {[...REPORT_STEPS.map((s) => s.title), "Check and send"].map((t, i) => (
            <li key={t} aria-current={i === step ? "step" : undefined} className={i === step ? "text-brand-800" : i < step ? "text-brand-700" : ""}>
              <span aria-hidden="true">{i < step ? "✓ " : ""}</span>
              <span className={i === step ? "" : "sr-only sm:not-sr-only"}>{t}</span>
            </li>
          ))}
        </ol>
      </div>

      {draft && (
        <div role="region" aria-label="Unfinished report" className="mb-6 rounded-2xl border-2 border-accent-300 bg-accent-50 p-4">
          <p className="font-semibold text-brand-900">
            You have an unfinished report
            {draft.values.client_id && clientName(draft.values.client_id) ? ` for ${clientName(draft.values.client_id)}` : ""}, saved at{" "}
            {new Date(draft.saved).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setValues(draft.values);
                setDraft(null);
                touched.current = true;
              }}
              className="min-h-12 rounded-full bg-brand-800 px-5 font-semibold text-white hover:bg-brand-700"
            >
              Continue it
            </button>
            <button
              type="button"
              onClick={() => {
                writeDraft(draftKey, null);
                setDraft(null);
              }}
              className="min-h-12 rounded-full border-2 border-brand-800 px-5 font-semibold text-brand-800 hover:bg-brand-50"
            >
              Start again
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="alert" className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 p-4 font-semibold text-red-800">
          {message}
        </p>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === REVIEW) send();
          else next();
        }}
        className="space-y-8"
      >
        {step === 0 && (
          <>
            {clients.length === 1 ? (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-brand-100">
                <p className="text-sm text-muted">Report for</p>
                <p className="text-xl font-bold text-brand-900">{clients[0].name}</p>
              </div>
            ) : (
              <Choices
                name="client_id"
                legend="Who did you visit?"
                type="radio"
                options={clients.map((c) => ({ value: c.id, label: c.name, hint: c.name !== c.fullName ? c.fullName : undefined }))}
                value={values.client_id}
                onChange={(v) => set("client_id", v as string)}
                error={errors.client_id}
              />
            )}
            {needLocation ? (
              <LocationCapture value={values.location} onChange={(loc) => set("location", loc)} error={errors.location} />
            ) : (
              <p className="rounded-2xl bg-white p-4 text-muted ring-1 ring-brand-100">
                <span aria-hidden="true">📍 </span>The location recorded when you sent this report stays as it is.
              </p>
            )}
            <TextField name="visit_date" label="Date of the visit" error={errors.visit_date}>
              <input
                id="visit_date"
                type="date"
                max={todayInGhana()}
                value={values.visit_date}
                onChange={(e) => set("visit_date", e.target.value)}
                aria-invalid={errors.visit_date ? true : undefined}
                aria-describedby={errors.visit_date ? "visit_date-error" : undefined}
                className={inputClass(errors.visit_date)}
              />
            </TextField>
            <div className="grid grid-cols-2 gap-3">
              <TextField name="start_time" label="Started" error={errors.start_time}>
                <input
                  id="start_time"
                  type="time"
                  step={300}
                  value={values.start_time}
                  onChange={(e) => set("start_time", e.target.value)}
                  aria-invalid={errors.start_time ? true : undefined}
                  aria-describedby={errors.start_time ? "start_time-error" : undefined}
                  className={inputClass(errors.start_time)}
                />
              </TextField>
              <TextField name="end_time" label="Finished" error={errors.end_time}>
                <input
                  id="end_time"
                  type="time"
                  step={300}
                  value={values.end_time}
                  onChange={(e) => set("end_time", e.target.value)}
                  aria-invalid={errors.end_time ? true : undefined}
                  aria-describedby={errors.end_time ? "end_time-error" : undefined}
                  className={inputClass(errors.end_time)}
                />
              </TextField>
            </div>
            <button type="button" onClick={() => set("end_time", nowHHMM())} className="-mt-4 text-base font-semibold text-brand-700 underline underline-offset-4">
              Set “Finished” to now
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <Choices name="mood" legend="How did they seem today?" type="radio" options={MOODS} value={values.mood} onChange={(v) => set("mood", v as string)} error={errors.mood} />
            <Choices
              name="activities"
              legend="What did you do together?"
              hint="Tick everything that applies."
              type="checkbox"
              columns={2}
              optional
              options={ACTIVITIES.map(({ value, label }) => ({ value, label }))}
              value={values.activities}
              onChange={(v) => set("activities", v as string[])}
            />
            <Choices name="meals" legend="Food and drink" type="radio" optional columns={2} options={MEALS} value={values.meals} onChange={(v) => set("meals", v as string)} error={errors.meals} />
            <Choices
              name="medication"
              legend="Medication"
              type="radio"
              optional
              columns={2}
              options={MEDICATION}
              value={values.medication}
              onChange={(v) => set("medication", v as string)}
              error={errors.medication}
            />
          </>
        )}

        {step === 2 && (
          <>
            <TextField
              name="summary"
              label="How did the visit go?"
              hint="What you did, how they were, anything that went well. Short sentences are fine."
              error={errors.summary}
            >
              <textarea
                id="summary"
                rows={6}
                maxLength={4000}
                value={values.summary}
                onChange={(e) => set("summary", e.target.value)}
                aria-invalid={errors.summary ? true : undefined}
                aria-describedby={`summary-hint summary-count${errors.summary ? " summary-error" : ""}`}
                className={inputClass(errors.summary)}
              />
              <p id="summary-count" className="mt-1 text-right text-sm text-muted">
                {values.summary.length} / 4,000
              </p>
            </TextField>
            <Choices
              name="concern_level"
              legend="Any concerns?"
              type="radio"
              options={CONCERNS}
              value={values.concern_level}
              onChange={(v) => set("concern_level", v as string)}
              error={errors.concern_level}
            />
            {values.concern_level !== "none" && (
              <TextField name="concerns" label="What is the concern?" hint="What you noticed, and anything you already did about it." error={errors.concerns}>
                <textarea
                  id="concerns"
                  rows={4}
                  maxLength={4000}
                  value={values.concerns}
                  onChange={(e) => set("concerns", e.target.value)}
                  aria-invalid={errors.concerns ? true : undefined}
                  aria-describedby={`concerns-hint${errors.concerns ? " concerns-error" : ""}`}
                  className={inputClass(errors.concerns)}
                />
              </TextField>
            )}
            {values.concern_level === "urgent" && (
              <div role="note" className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-900">
                <p className="font-bold">Urgent? Don&apos;t rely on this report alone.</p>
                <p className="mt-1">
                  Call the office now{officePhone ? "" : " as well"}. If anyone is in danger, call <strong>112</strong> first.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {officePhone && (
                    <a href={`tel:${officePhone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-12 items-center rounded-full bg-red-700 px-5 font-semibold text-white hover:bg-red-800">
                      Call the office
                    </a>
                  )}
                  <a href="tel:112" className="inline-flex min-h-12 items-center rounded-full border-2 border-red-700 px-5 font-semibold text-red-800 hover:bg-red-100">
                    Call 112
                  </a>
                </div>
              </div>
            )}
          </>
        )}

        {step === REVIEW && (
          <div className="space-y-4">
            {[
              {
                step: 0,
                title: "The visit",
                rows: [
                  ["Client", clientName(values.client_id)],
                  ["Date", values.visit_date ? new Date(`${values.visit_date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "—"],
                  ["Time", visitTimes(values.start_time || null, values.end_time || null)],
                  ...(needLocation
                    ? [
                        [
                          "Location",
                          values.location?.status === "captured"
                            ? `Recorded${values.location.accuracy != null ? ` (accurate to about ${Math.round(values.location.accuracy)} m)` : ""}`
                            : values.location
                              ? `Not sent: ${LOCATION_PROBLEMS[values.location.status as keyof typeof LOCATION_PROBLEMS].toLowerCase()}`
                              : "Not shared yet",
                        ],
                      ]
                    : []),
                ],
              },
              {
                step: 1,
                title: "How they were",
                rows: [
                  ["Mood", `${MOODS.find((m) => m.value === values.mood)?.icon ?? ""} ${labelOf(MOODS, values.mood)}`],
                  ["Activities", values.activities.length ? values.activities.map((a) => labelOf(ACTIVITIES, a)).join(", ") : "None ticked"],
                  ["Food and drink", values.meals ? labelOf(MEALS, values.meals) : "Not answered"],
                  ["Medication", values.medication ? labelOf(MEDICATION, values.medication) : "Not answered"],
                ],
              },
              {
                step: 2,
                title: "Notes & concerns",
                rows: [
                  ["How it went", values.summary],
                  ["Concerns", values.concern_level === "none" ? "No concerns" : `${labelOf(CONCERNS, values.concern_level)}: ${values.concerns}`],
                ],
              },
            ].map((section) => (
              <section key={section.title} className="rounded-2xl bg-white p-4 ring-1 ring-brand-100">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-brand-900">{section.title}</h2>
                  <button
                    type="button"
                    onClick={() => setStep(section.step)}
                    className="min-h-11 rounded-full px-3 font-semibold text-brand-700 underline underline-offset-4"
                    aria-label={`Change ${section.title.toLowerCase()}`}
                  >
                    Change
                  </button>
                </div>
                <dl className="mt-2 space-y-2">
                  {section.rows.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-sm text-muted">{k}</dt>
                      <dd className="whitespace-pre-line text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <p className="text-muted">
              {reportId
                ? "Your changes replace what you sent before."
                : "After you send it, you can still correct the report until the office reads it."}
            </p>
          </div>
        )}

        {/* Actions sit in the thumb zone, above the tab bar. */}
        <div className="sticky bottom-16 -mx-4 border-t border-brand-100 bg-white/95 px-4 py-3 backdrop-blur">
          <p aria-live="polite" className="mb-2 min-h-5 text-center text-sm text-muted">
            {pending
              ? reportId
                ? "Saving your changes…"
                : "Sending your report…"
              : savedAt
                ? `✓ Saved on this phone at ${new Date(savedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
          </p>
          <div className="flex gap-3">
            {step > 0 ? (
              <button type="button" onClick={back} disabled={pending} className="min-h-14 flex-1 rounded-full border-2 border-brand-800 font-semibold text-brand-800 hover:bg-brand-50">
                Back
              </button>
            ) : (
              <Link href={reportId ? `/portal/report/${reportId}` : "/portal"} className="flex min-h-14 flex-1 items-center justify-center rounded-full border-2 border-brand-200 font-semibold text-brand-800 hover:bg-brand-50">
                {reportId ? "Cancel" : "Not now"}
              </Link>
            )}
            <button
              type="submit"
              disabled={pending}
              className="min-h-14 flex-[2] rounded-full bg-accent-500 font-bold text-brand-950 hover:bg-accent-400 disabled:cursor-wait disabled:opacity-70"
            >
              {step === REVIEW ? (pending ? "Sending…" : reportId ? "Save changes" : "Send report") : "Continue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
