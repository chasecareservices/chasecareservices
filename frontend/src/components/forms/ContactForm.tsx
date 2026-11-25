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
import { CONTACT_TOPICS, type EnquiryType } from "@/lib/enquiry-topics";


export function ContactForm({
  initialTopic = "contact",
  initialSubject = "",
  context = {},
}: {
  initialTopic?: EnquiryType;
  initialSubject?: string;
  context?: Record<string, string>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = formValue(form, "email");
    const phone = formValue(form, "phone");
    if (!email && !phone) {
      setError("Please give us an email address or a phone number so we can reply.");
      return;
    }
    setPending(true);
    setError(null);
    const err = await submitEnquiry({
      enquiry_type: formValue(form, "topic") as EnquiryType,
      full_name: formValue(form, "full_name"),
      email,
      phone,
      country: formValue(form, "country"),
      subject: formValue(form, "subject"),
      message: formValue(form, "message"),
      payload: { ...context, preferred_contact: formValue(form, "preferred_contact") },
      website: formValue(form, "website"),
    });
    setPending(false);
    if (err) setError(err);
    else setDone(true);
  }

  if (done) {
    return (
      <ThankYou title="Thank you — your message has been sent">
        A member of the Chase Care Services team will review your message and contact you.
      </ThankYou>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5" noValidate={false}>
      <Honeypot />
      <Field label="What is your enquiry about?" htmlFor="topic" required>
        <select id="topic" name="topic" defaultValue={initialTopic} className={inputClass}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Country you live in" htmlFor="country">
          <input id="country" name="country" autoComplete="country-name" defaultValue="Ghana" maxLength={100} className={inputClass} />
        </Field>
        <Field label="Best way to contact you" htmlFor="preferred_contact">
          <select id="preferred_contact" name="preferred_contact" className={inputClass} defaultValue="any">
            <option value="any">Any</option>
            <option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </Field>
      </div>
      <Field label="Subject" htmlFor="subject">
        <input id="subject" name="subject" defaultValue={initialSubject} maxLength={200} className={inputClass} />
      </Field>
      <Field label="Your message" htmlFor="message" required>
        <textarea id="message" name="message" required rows={6} maxLength={5000} className={inputClass} />
      </Field>
      <ConsentCheckbox />
      <FormStatus error={error} />
      <SubmitButton pending={pending}>Send message</SubmitButton>
    </form>
  );
}
