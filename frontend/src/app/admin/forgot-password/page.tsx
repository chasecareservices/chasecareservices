"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthCard, AuthError, authButton, authInput } from "@/components/admin/AuthCard";
import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const { error } = await createAuthBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/set-password`,
    });
    setPending(false);
    // Same message whether or not the email exists, so accounts can't be discovered.
    if (error && !/not.*found/i.test(error.message)) setError("We couldn't send the email just now. Please try again in a minute.");
    else setSent(true);
  }

  return (
    <AuthCard title="Reset your password">
      {sent ? (
        <div role="status" className="space-y-4">
          <p>If that email belongs to a staff account, we&apos;ve sent a link to set a new password. It expires in one hour.</p>
          <Link href="/admin/login" className="font-medium text-brand-700 underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-brand-900">
            Your staff email
            <input name="email" type="email" required autoComplete="username" className={authInput} />
          </label>
          <AuthError message={error} />
          <button type="submit" disabled={pending} className={authButton}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm">
            <Link href="/admin/login" className="font-medium text-brand-700 underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
