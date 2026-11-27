"use client";

import { useState, type FormEvent } from "react";
import { ConsentCheckbox, Field, FormStatus, Honeypot, SubmitButton, ThankYou, formValue, inputClass, submitEnquiry } from "@/components/forms/fields";
import { AVAILABILITY, ROLES } from "@/lib/recruitment";

const LANGUAGES = ["English", "Twi", "Ga", "Ewe", "Fante", "Hausa", "Dagbani", "French"];

/** "Apply to join our team": arrives in the dashboard ready to add to the recruitment pipeline. */
export function WorkerApplicationForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = formValue(form, "email");
    const phone = formValue(form, "phone");
    const availability = form.getAll("availability").map(String);
    const languages = form.getAll("languages").map(String);
    if (!email && !phone) return setError("Please give us an email address or a phone number so we can reply.");
    if (!availability.length) return setError("Please tick when you can work.");
    if (form.get("checks_consent") !== "on") return setError("Please agree to the interview, reference and background checks.");
    setPending(true);
    setError(null);
    const role = formValue(form, "role");
    const err = await submitEnquiry({
      enquiry_type: "worker_application",
      full_name: formValue(form, "full_name"),
      email,
      phone,
      country: "Ghana",
      subject: `Job application: ${role}`,
      message: formValue(form, "about"),
      payload: {
        role,
        location: formValue(form, "location"),
        travel_areas: formValue(form, "travel_areas"),
        availability,
        start_date: formValue(form, "start_date"),
        experience_years: formValue(form, "experience_years"),
        qualifications: formValue(form, "qualifications"),
        languages,
        has_ghana_card: formValue(form, "has_ghana_card"),
        checks_consent: true,
      },
      website: formValue(form, "website"),
    });
    setPending(false);
    if (err) setError(err);
    else setDone(true);
  }

  if (done) {
    return (
      <ThankYou title="Thank you for applying">
        We&apos;ve received your application. A member of our team will contact you about the next step, usually an interview. Please have your Ghana Card,
        certificates and the contact details of two referees ready.
      </ThankYou>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-8">
      <Honeypot />
      <fieldset className="space-y-5">
        <legend className="mb-2 text-lg font-bold text-brand-900">1. About you</legend>
        <Field label="Full name" htmlFor="full_name" required>
          <input id="full_name" name="full_name" required maxLength={120} autoComplete="name" className={inputClass} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone / WhatsApp" htmlFor="phone" hint="Email or phone is required">
            <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Where do you live?" htmlFor="location" required>
            <input id="location" name="location" required maxLength={200} placeholder="e.g. Madina, Accra" className={inputClass} />
          </Field>
          <Field label="Areas you can travel to" htmlFor="travel_areas" hint="Optional">
            <input id="travel_areas" name="travel_areas" maxLength={200} placeholder="e.g. East Legon, Spintex, Tema" className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-2 text-lg font-bold text-brand-900">2. The work</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Role you're applying for" htmlFor="role" required>
            <select id="role" name="role" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Choose…
              </option>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Years of care experience" htmlFor="experience_years" required>
            <select id="experience_years" name="experience_years" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Choose…
              </option>
              {["None yet: I want to train", "Less than 1 year", "1–2 years", "3–5 years", "More than 5 years"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-900">
            When can you work? <span className="text-red-700">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {AVAILABILITY.map((a) => (
              <label key={a} className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-100 px-4 py-2 text-sm has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50">
                <input type="checkbox" name="availability" value={a} className="h-5 w-5 rounded accent-brand-800" />
                {a}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="When could you start?" htmlFor="start_date" hint="Optional">
          <input id="start_date" name="start_date" type="date" className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-2 text-lg font-bold text-brand-900">3. Skills and qualifications</legend>
        <Field label="Qualifications and training" htmlFor="qualifications" hint="e.g. Registered Nurse (NMC Ghana), Healthcare Assistant certificate, First Aid">
          <textarea id="qualifications" name="qualifications" rows={3} maxLength={2000} className={inputClass} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-900">Languages you speak</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => (
              <label key={l} className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-100 px-4 py-2 text-sm has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50">
                <input type="checkbox" name="languages" value={l} className="h-5 w-5 rounded accent-brand-800" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Do you have a Ghana Card?" htmlFor="has_ghana_card" required>
          <select id="has_ghana_card" name="has_ghana_card" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose…
            </option>
            <option>Yes</option>
            <option>Not yet</option>
          </select>
        </Field>
        <Field label="Tell us about yourself" htmlFor="about" hint="Your experience, why you want to work in care, anything else we should know">
          <textarea id="about" name="about" rows={5} maxLength={5000} className={inputClass} />
        </Field>
      </fieldset>

      <label className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-ink">
        <input type="checkbox" name="checks_consent" required className="mt-0.5 h-5 w-5 flex-none rounded accent-brand-800" />
        <span>
          I understand that before working with clients I will be interviewed, my ID and references will be checked, I may need a background check, and I will
          complete safeguarding training and a competency assessment.
        </span>
      </label>
      <ConsentCheckbox />
      <FormStatus error={error} />
      <SubmitButton pending={pending}>Send my application</SubmitButton>
    </form>
  );
}
