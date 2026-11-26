"use client";

/* eslint-disable @next/next/no-img-element -- the QR code is a data: URL from Supabase */
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthCard, AuthError, authButton, authInput } from "@/components/admin/AuthCard";
import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";

type Mode =
  | { kind: "loading" }
  | { kind: "verify"; factorId: string }
  | { kind: "enrol"; factorId: string; qr: string; secret: string }
  | { kind: "error"; message: string };

/**
 * Two-step verification with an authenticator app (Google Authenticator, Microsoft
 * Authenticator, Authy…). First time: scan a QR code. After that: type the 6-digit code.
 */
export default function TwoStepPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createAuthBrowserClient();
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setMode({ kind: "verify", factorId: verified.id });
        return;
      }
      // Remove any half-finished set-up before starting a fresh one.
      for (const f of data.all.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const enrol = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
      if (enrol.error) throw enrol.error;
      setMode({ kind: "enrol", factorId: enrol.data.id, qr: enrol.data.totp.qr_code, secret: enrol.data.totp.secret });
    })().catch((e: Error) => setMode({ kind: "error", message: e.message }));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode.kind !== "verify" && mode.kind !== "enrol") return;
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setPending(true);
    setError(null);
    const { error } = await createAuthBrowserClient().auth.mfa.challengeAndVerify({ factorId: mode.factorId, code });
    if (error) {
      setPending(false);
      setError("That code didn't work. Codes change every 30 seconds — please try the current one.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  async function signOut() {
    await createAuthBrowserClient().auth.signOut();
    router.replace("/admin/login");
  }

  const codeForm = (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-semibold text-brand-900">
        6-digit code from your authenticator app
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className={`${authInput} text-center text-2xl tracking-[0.4em]`}
        />
      </label>
      <AuthError message={error} />
      <button type="submit" disabled={pending} className={authButton}>
        {pending ? "Checking…" : "Verify"}
      </button>
    </form>
  );

  return (
    <AuthCard
      title={mode.kind === "enrol" ? "Set up two-step verification" : "Two-step verification"}
      intro={
        mode.kind === "enrol"
          ? "Staff accounts are protected with an authenticator app, because the dashboard holds personal and health information."
          : "Open your authenticator app and enter the current code for Chase Care."
      }
    >
      {mode.kind === "loading" && <p role="status">Loading…</p>}
      {mode.kind === "error" && <AuthError message={mode.message} />}
      {mode.kind === "verify" && codeForm}
      {mode.kind === "enrol" && (
        <div className="space-y-5">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Install Google Authenticator, Microsoft Authenticator or Authy on your phone.</li>
            <li>In the app, add an account and scan this QR code.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <img src={mode.qr} alt="QR code to add Chase Care to your authenticator app" className="mx-auto h-48 w-48" />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-brand-700">Can&apos;t scan? Enter this key instead</summary>
            <code className="mt-2 block break-all rounded-lg bg-brand-50 p-3 font-mono text-brand-900">{mode.secret}</code>
          </details>
          {codeForm}
        </div>
      )}
      <button type="button" onClick={signOut} className="mt-6 w-full text-center text-sm font-medium text-brand-700 underline">
        Sign out
      </button>
    </AuthCard>
  );
}
