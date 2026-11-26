"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from "@/lib/consent";
import { TRANSLATE_COOKIE, cookieDomains } from "@/lib/languages";

/** Removes Google Translate's language cookie (used when preference cookies are refused). */
function clearTranslation() {
  if (!document.cookie.includes(`${TRANSLATE_COOKIE}=`)) return false;
  for (const domain of cookieDomains(window.location.hostname)) {
    document.cookie = `${TRANSLATE_COOKIE}=; path=/${domain ? `; domain=${domain}` : ""}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
  return true;
}

/**
 * Cookie banner: equal "Accept all" and "Reject" buttons, plus "Preferences" to
 * choose each kind. It does not block the page. "Cookie settings" in the footer
 * opens the preferences again at any time.
 */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const saved = readConsent();
    setShow(!saved);
    setPrefs(saved?.preferences ?? false);
    const open = () => {
      setPrefs(readConsent()?.preferences ?? false);
      dialog.current?.showModal();
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  function decide(preferences: boolean) {
    saveConsent(preferences);
    setPrefs(preferences);
    setShow(false);
    dialog.current?.close();
    if (!preferences && clearTranslation()) window.location.reload(); // back to English without Google's cookies
  }

  return (
    <>
      {show && (
        <section
          aria-label="Cookie choices"
          className="notranslate fixed inset-x-0 bottom-0 z-[60] border-t-4 border-accent-500 bg-brand-950 text-white shadow-2xl"
          translate="no"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
            <p className="text-sm leading-relaxed text-brand-50 lg:flex-1">
              We use cookies that the site needs to work. With your permission, we also use preference cookies so you can read the site in your language
              (Google Translate). We don&apos;t use advertising or tracking cookies.{" "}
              <Link href="/cookie-policy" className="font-semibold text-white underline underline-offset-2">
                Cookie policy
              </Link>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => dialog.current?.showModal()}
                className="min-h-11 rounded-full border-2 border-white/70 px-5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Preferences
              </button>
              <button type="button" onClick={() => decide(false)} className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-brand-900 hover:bg-brand-50">
                Reject
              </button>
              <button
                type="button"
                onClick={() => decide(true)}
                className="min-h-11 rounded-full bg-accent-500 px-5 text-sm font-semibold text-brand-950 hover:bg-accent-400"
              >
                Accept all
              </button>
            </div>
          </div>
        </section>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="cookie-settings-title"
        className="notranslate m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl p-0 text-ink shadow-2xl backdrop:bg-brand-950/60"
        translate="no"
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            decide(prefs);
          }}
          className="p-6"
        >
          <h2 id="cookie-settings-title" className="text-xl font-bold text-brand-900">
            Cookie preferences
          </h2>
          <p className="mt-1 text-sm text-muted">Choose which cookies we may use. You can change this at any time from &ldquo;Cookie settings&rdquo; at the bottom of every page.</p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-brand-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-brand-900">Strictly necessary</h3>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">Always on</span>
              </div>
              <p className="mt-1 text-sm text-muted">Keep staff and care workers signed in, and remember this choice. The site can&apos;t work without them.</p>
            </div>
            <label className="block cursor-pointer rounded-xl border border-brand-100 p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400">
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold text-brand-900">Preferences</span>
                <input type="checkbox" checked={prefs} onChange={(e) => setPrefs(e.target.checked)} className="h-6 w-6 accent-brand-700" />
              </span>
              <span className="mt-1 block text-sm text-muted">
                Remember the language you choose and let Google Translate show the site in it. Google sets its own cookies for this.
              </span>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => decide(false)} className="min-h-11 rounded-full border-2 border-brand-800 px-5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
              Reject all
            </button>
            <button type="submit" className="min-h-11 rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Save my choices
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Footer link that reopens the cookie preferences. */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))} className={className}>
      Cookie settings
    </button>
  );
}
