"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthError, authButton, authInput } from "@/components/admin/AuthCard";
import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";

/** Only follow ?next= links inside this site's own staff, worker and learner areas. */
function safeNext(value: string | null, fallback: string) {
  return value && (value.startsWith("/admin") || value.startsWith("/portal") || value.startsWith("/learn")) && !value.startsWith("//") ? value : fallback;
}

export function LoginForm({ home = "/admin" }: { home?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error") === "inactive" ? "This account has been deactivated." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await createAuthBrowserClient().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setPending(false);
      setError(error.message.includes("Invalid login") ? "That email and password don't match. Please try again." : error.message);
      return;
    }
    router.replace(safeNext(params.get("next"), home));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-semibold text-brand-900">
        Email
        <input name="email" type="email" required autoComplete="username" className={authInput} />
      </label>
      <label className="block text-sm font-semibold text-brand-900">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={authInput} />
      </label>
      <AuthError message={error} />
      <button type="submit" disabled={pending} className={authButton}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm">
        <Link href="/admin/forgot-password" className="font-medium text-brand-700 underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

