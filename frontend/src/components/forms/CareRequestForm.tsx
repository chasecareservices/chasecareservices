"use client";

import { useState, type FormEvent } from "react";
import {
  ConsentCheckbox,
  Field,
  FormStatus,
  Honeypot,
  SubmitButton,
  ThankYou,
  formValue,
  inputClass,
  submitEnquiry,
} from "@/components/forms/fields";

// Options from the client proposal, section 11 ("I Need Care").
const WHO_NEEDS_CARE = ["Myself", "Parent", "Child", "Spouse", "Relative", "Other"];
const SUPPORT_TYPES = [
  "Elderly care",
  "Disability",
  "Autism",
  "Home care",
  "Respite",
  "Weekend care",
  "Nanny",
  "Housekeeping",
  "Therapy",
  "Community support",
  "Hospital support",
  "School support",
  "Other",
];
const FREQUENCY = ["One-off", "Daily", "Weekly", "Weekends", "Overnight", "Live-in", "Short-term", "Long-term"];

export function CareRequestForm({ abroad = false, service }: { abroad?: boolean; service?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [livesAbroad, setLivesAbroad] = useState(abroad);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = formValue(form, "email");
    const phone = formValue(form, "phone");
    const supportTypes = form.getAll("support_types").filter((v): v is string => typeof v === "string");
    if (!email && !phone) {
      setError("Please give us an email address or a phone number so we can reply.");
      return;
    }
    if (!supportTypes.length) {
      setError("Please choose at least one type of support.");
      return;
    }
    setPending(true);
    setError(null);
    const err = await submitEnquiry({
      enquiry_type: "care_request",
      full_name: formValue(form, "full_name"),
      email,
      phone,
      country: livesAbroad ? formValue(form, "country") : "Ghana",
      subject: `Care request: ${supportTypes.join(", ")}`,
      message: formValue(form, "requirements"),
      payload: {
        lives_abroad: livesAbroad,
        location: formValue(form, "location"),
        who_needs_care: formValue(form, "who_needs_care"),
        care_recipient_location: formValue(form, "care_recipient_location"),
        support_types: supportTypes,
        frequency: formValue(form, "frequency"),
        service_page: service ?? null,
      },
      website: formValue(form, "website"),
    });
    setPending(false);
    if (err) setError(err);
    else setDone(true);
  }

  if (done) {
    return (
      <ThankYou title="Thank you">
        A member of the Chase Care Services team will review your request and contact you.
      </ThankYou>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-8">
      <Honeypot />

      <fieldset className="space-y-5">
        <legend className="mb-2 text-lg font-bold text-brand-900">1. Your details</legend>
        <Field label="Your full name" htmlFor="full_name" required>
          <input id="full_name" name="full_name" required maxLength={200} autoComplete="name" className={inputClass} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" hint="Email or phone is required">
            <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
          </Field>
          <Field label="Phone / WhatsApp" htmlFor="phone">
            <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className={inputClass} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-brand-900">
          <input
            type="checkbox"
            checked={livesAbroad}
            onChange={(e) => setLivesAbroad(e.target.checked)}
            className="h-5 w-5 rounded accent-brand-800"
          />
          I live outside Ghana and am arranging care for someone in Ghana
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          {livesAbroad && (
            <Field label="Country you live in" htmlFor="country" required>
              <input id="country" name="country" required autoComplete="country-name" maxLength={100} className={inputClass} />
            </Field>
          )}
          <Field label={livesAbroad ? "Your town / city" : "Your town / area in Ghana"} htmlFor="location">
            <input id="location" name="location" maxLength={200} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-2 text-lg font-bold text-brand-900">2. Who needs care?</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="The person who needs care is" htmlFor="who_needs_care" required>
            <select id="who_needs_care" name="who_needs_care" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Choose…
              </option>
              {WHO_NEEDS_CARE.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </Field>
          <Field label="Where in Ghana are they?" htmlFor="care_recipient_location" required>
            <input id="care_recipient_location" name="care_recipient_location" required placeholder="e.g. Kumasi, Ashanti" maxLength={200} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-bold text-brand-900">
          3. Type of support <span className="text-sm font-normal text-muted">(choose all that apply)</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SUPPORT_TYPES.map((s) => (
            <label key={s} className="flex items-center gap-3 rounded-xl border border-brand-100 px-4 py-3 text-sm has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50">
              <input type="checkbox" name="support_types" value={s} className="h-5 w-5 rounded accent-brand-800" />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-2 text-lg font-bold text-brand-900">4. How often?</legend>
        <Field label="Preferred frequency" htmlFor="frequency" required>
          <select id="frequency" name="frequency" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {FREQUENCY.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="Additional information and care requirements" htmlFor="requirements" hint="Health conditions, mobility, routines, languages spoken, preferred start date…">
          <textarea id="requirements" name="requirements" rows={5} maxLength={5000} className={inputClass} />
        </Field>
      </fieldset>

      <ConsentCheckbox />
      <FormStatus error={error} />
      <SubmitButton pending={pending}>Submit care request</SubmitButton>
    </form>
  );
}
