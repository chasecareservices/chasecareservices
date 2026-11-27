"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthCard, AuthError, authButton, authInput } from "@/components/admin/AuthCard";
import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";

/**
 * Landing page for "reset password" and "you've been invited" email links.
 * Signs the person in from the link, then asks for a new password.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Accounts with two-step verification must confirm a code before the password can change. */
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createAuthBrowserClient();
    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const code = url.searchParams.get("code");
      if (hash.get("access_token") && hash.get("refresh_token")) {
        await supabase.auth.setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! });
      } else if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      window.history.replaceState(null, "", "/admin/set-password");
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totp = factors?.totp.find((f) => f.status === "verified");
          if (totp) setFactorId(totp.id);
        }
      }
      setReady(data.user ? "ok" : "invalid");
    })().catch(() => setReady("invalid"));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("The two passwords don't match.");
      return;
    }
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Use at least 10 characters, with upper-case and lower-case letters and a number.");
      return;
    }
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    if (factorId && !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createAuthBrowserClient();
    if (factorId) {
      const { error: codeError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (codeError) {
        setPending(false);
        setError("That code didn't work. Check the time on your phone and try the newest code.");
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPending(false);
      setError(error.message);
      return;
    }
    router.replace("/admin"); // care workers are sent on to /portal
    router.refresh();
  }

  return (
    <AuthCard title="Choose a password" intro="Use at least 10 characters, with upper-case and lower-case letters and a number.">
      {ready === "checking" && <p role="status">Checking your link…</p>}
      {ready === "invalid" && (
        <AuthError message="This link has expired or has already been used. Ask for a new one from the sign-in page." />
      )}
      {ready === "ok" && (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-brand-900">
            New password
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className={authInput} />
          </label>
          <label className="block text-sm font-semibold text-brand-900">
            Repeat new password
            <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className={authInput} />
          </label>
          {factorId && (
            <label className="block text-sm font-semibold text-brand-900">
              6-digit code from your authenticator app
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                required
                className={authInput}
              />
              <span className="mt-1 block text-xs font-normal text-muted">Your account uses two-step verification, so the code is needed to change the password.</span>
            </label>
          )}
          <AuthError message={error} />
          <button type="submit" disabled={pending} className={authButton}>
            {pending ? "Saving…" : "Save password"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
