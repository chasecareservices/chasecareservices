import type { ReactNode } from "react";
import { LogoMark } from "@/components/LogoMark";

/** Centered card used by the sign-in, password and two-step screens. */
export function AuthCard({ title, intro, children, subtitle = "Staff dashboard" }: { title: string; intro?: ReactNode; children: ReactNode; subtitle?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-brand-100">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark className="h-10 w-auto" />
          <div>
            <p className="font-display text-xl font-bold tracking-[0.18em] text-brand-800">
              C<span className="text-accent-500">H</span>A<span className="text-accent-500">S</span>E
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{subtitle}</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-brand-900">{title}</h1>
        {intro && <div className="mt-2 text-sm text-muted">{intro}</div>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export const authInput =
  "mt-1 block w-full rounded-xl border border-brand-200 px-4 py-3 text-base text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export const authButton =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-800 px-6 font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70";

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </p>
  );
}
