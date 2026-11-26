"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useId } from "react";
import { subscribe } from "@/app/(site)/newsletter-actions";

/**
 * "Get new articles by email" form. `tone="dark"` for the footer, `light` for cards
 * on the News & Blog pages.
 */
export function NewsletterSignup({ tone = "light", heading = "Get new articles by email" }: { tone?: "light" | "dark"; heading?: string }) {
  const [state, action, pending] = useActionState(subscribe, undefined);
  const id = useId();
  const pathname = usePathname();
  const dark = tone === "dark";

  if (state?.ok) {
    return (
      <div role="status" className={`rounded-2xl p-5 ${dark ? "bg-white/10 text-white" : "bg-green-50 text-green-900 ring-1 ring-green-200"}`}>
        <p className="font-semibold">✉ Check your inbox</p>
        <p className="mt-1 text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className={`text-sm font-semibold uppercase tracking-widest ${dark ? "text-accent-400" : "text-accent-700"}`}>
        {heading}
      </h2>
      <p className={`mt-2 text-sm ${dark ? "text-brand-200" : "text-muted"}`}>News, care tips and stories from Chase Care. About twice a month. Unsubscribe any time.</p>
      <input type="hidden" name="source" value={pathname} />
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor={`${id}-website`}>Leave this field empty</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Your email address
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          aria-describedby={state?.message ? `${id}-err` : undefined}
          className={`min-h-11 w-full rounded-full border px-4 text-sm ${
            dark ? "border-white/40 bg-brand-900 text-white placeholder:text-brand-200" : "border-brand-200 bg-white text-ink placeholder:text-muted"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 flex-none rounded-full bg-accent-500 px-5 text-sm font-semibold text-brand-950 hover:bg-accent-400 disabled:opacity-70"
        >
          {pending ? "Signing up…" : "Subscribe"}
        </button>
      </div>
      <label className={`mt-3 flex items-start gap-2 text-xs ${dark ? "text-brand-100" : "text-muted"}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 flex-none accent-accent-500" />
        <span>
          Yes, email me new articles and news. See our{" "}
          <Link href="/privacy-policy" className="underline">
            privacy policy
          </Link>
          .
        </span>
      </label>
      {state?.message && (
        <p id={`${id}-err`} role="alert" className={`mt-2 text-sm font-semibold ${dark ? "text-accent-300" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
