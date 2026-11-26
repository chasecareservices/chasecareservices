"use client";

import type { ReactNode } from "react";
import type { Database } from "@/lib/database.types";
import { getBrowserClient } from "@/lib/supabase/client";
import { announceEnquiry } from "@/app/(site)/enquiry-actions";

import type { EnquiryType } from "@/lib/enquiry-topics";

export const inputClass =
  "mt-1 block w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-base text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-brand-900">
        {label}
        {required && (
          <span className="text-accent-700" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Hidden from people, filled in by bots. The database ignores submissions that fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="website">Leave this field empty</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export function ConsentCheckbox() {
  return (
    <label className="flex items-start gap-3 text-sm text-ink">
      <input name="consent" type="checkbox" required className="mt-1 h-5 w-5 flex-none rounded border-brand-300 accent-brand-800" />
      <span>
        I agree that Chase Care Services may store and use these details to respond to my enquiry, as described in the{" "}
        <a href="/privacy-policy" className="font-semibold text-brand-700 underline" target="_blank">
          Privacy Policy
        </a>
        . <span className="text-accent-700">*</span>
      </span>
    </label>
  );
}

export type SubmitInput = {
  enquiry_type: EnquiryType;
  full_name: string;
  email?: string;
  phone?: string;
  country?: string;
  subject?: string;
  message?: string;
  payload?: Record<string, unknown>;
  website?: string;
};

/** Sends a form to the database's submit_enquiry() function. Returns an error message or null. */
export async function submitEnquiry(input: SubmitInput): Promise<string | null> {
  try {
    const { data, error } = await getBrowserClient().rpc("submit_enquiry", {
      enquiry_type: input.enquiry_type,
      full_name: input.full_name,
      consent_given: true,
      email: input.email || undefined,
      phone: input.phone || undefined,
      country: input.country || undefined,
      subject: input.subject || undefined,
      message: input.message || undefined,
      payload: (input.payload ?? {}) as Database["public"]["Functions"]["submit_enquiry"]["Args"]["payload"],
      source_page: typeof window !== "undefined" ? window.location.pathname : undefined,
      website: input.website || undefined,
    });
    if (!error) {
      // Tell the office by email. Never blocks or fails the visitor's submission.
      if (typeof data === "string") await announceEnquiry(data).catch(() => undefined);
      return null;
    }
    if (error.code === "23514") return "Please check your email address and try again.";
    if (error.code === "22023" || error.code === "54000") return error.message;
    return "Sorry, something went wrong sending your message. Please try again, or call or WhatsApp us.";
  } catch {
    return "Sorry, we couldn't reach our server. Please check your connection and try again.";
  }
}

export function FormStatus({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {error}
    </p>
  );
}

export function ThankYou({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="status" className="rounded-3xl border border-brand-100 bg-brand-50 p-8 text-center">
      <p aria-hidden="true" className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-2xl font-bold text-brand-950">
        ✓
      </p>
      <h2 className="text-2xl font-bold text-brand-900">{title}</h2>
      <div className="mt-3 text-muted">{children}</div>
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent-500 px-6 font-semibold text-brand-950 transition hover:bg-accent-400 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
    >
      {pending ? "Sending…" : children}
    </button>
  );
}

export function formValue(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}
