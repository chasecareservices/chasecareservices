"use client";

import { useState, type FormEvent } from "react";
import { confirmRegistration } from "@/app/(site)/event-actions";
import { ConsentCheckbox, Field, FormStatus, Honeypot, SubmitButton, ThankYou, formValue, inputClass } from "@/components/forms/fields";
import { registrationError } from "@/lib/events";
import { getBrowserClient } from "@/lib/supabase/client";

/** Register for one event. Online is offered only when the event can be joined online. */
export function EventRegistrationForm({ eventId, online, full, title }: { eventId: string; online: boolean; full: boolean; title: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { email: boolean; mode: string }>(null);
  const onlineOnly = full && online;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = formValue(form, "email");
    const phone = formValue(form, "phone");
    if (!email && !phone) return setError("Please give us an email address or a phone number.");
    const mode = onlineOnly ? "online" : formValue(form, "attend_mode") || "in_person";
    setPending(true);
    setError(null);
    try {
      const { data, error: err } = await getBrowserClient().rpc("register_for_event", {
        event: eventId,
        full_name: formValue(form, "full_name"),
        consent_given: form.get("consent") === "on",
        email: email || undefined,
        phone: phone || undefined,
        attend_mode: mode,
        organisation: formValue(form, "organisation") || undefined,
        needs: formValue(form, "needs") || undefined,
        website: formValue(form, "website") || undefined,
      });
      if (err) setError(registrationError(err.code, err.message));
      else {
        if (typeof data === "string") await confirmRegistration(data).catch(() => undefined);
        setDone({ email: !!email, mode });
      }
    } catch {
      setError("Sorry, we couldn't reach our server. Please check your connection and try again.");
    }
    setPending(false);
  }

  if (done) {
    return (
      <ThankYou title="You're registered!">
        Thank you for registering for {title}.{" "}
        {done.email
          ? `We've emailed your confirmation${done.mode === "online" ? " with the joining link (or we'll send it before the event)" : ""}.`
          : "We'll contact you by phone before the event."}
      </ThankYou>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5">
      <Honeypot />
      <Field label="Full name" htmlFor="full_name" required>
        <input id="full_name" name="full_name" required maxLength={120} autoComplete="name" className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" hint="For your confirmation">
          <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="phone" hint="Email or phone is required">
          <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className={inputClass} />
        </Field>
      </div>
      {online && !onlineOnly && (
        <fieldset>
          <legend className="text-sm font-semibold text-brand-900">How will you join?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ["in_person", "In person"],
              ["online", "Online (video call)"],
            ].map(([v, l]) => (
              <label key={v} className="flex min-h-12 items-center gap-3 rounded-xl border border-brand-100 px-4 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50">
                <input type="radio" name="attend_mode" value={v} defaultChecked={v === "in_person"} className="h-5 w-5 accent-brand-800" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {onlineOnly && <p className="rounded-xl bg-accent-50 p-3 text-sm text-ink">The room is full, but you can still join online.</p>}
      <Field label="Organisation" htmlFor="organisation" hint="Optional: school, hospital, church, company…">
        <input id="organisation" name="organisation" maxLength={200} className={inputClass} />
      </Field>
      <Field label="Access needs or a question for the speaker" htmlFor="needs" hint="Optional">
        <textarea id="needs" name="needs" rows={3} maxLength={1000} className={inputClass} />
      </Field>
      <ConsentCheckbox />
      <FormStatus error={error} />
      <SubmitButton pending={pending}>Register</SubmitButton>
    </form>
  );
}
