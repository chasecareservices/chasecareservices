"use client";

import { useEffect, useState } from "react";
import { readConsent, saveConsent } from "@/lib/consent";
import { LANGUAGES, SOURCE_LANGUAGE, TRANSLATE_COOKIE, cookieDomains, languageFromCookie } from "@/lib/languages";

function writeCookie(value: string | null) {
  const domains = cookieDomains(window.location.hostname);
  for (const domain of domains) {
    const domainPart = domain ? `; domain=${domain}` : "";
    document.cookie =
      value === null
        ? `${TRANSLATE_COOKIE}=; path=/${domainPart}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        : `${TRANSLATE_COOKIE}=${value}; path=/${domainPart}; max-age=31536000; SameSite=Lax`;
  }
}

/** Footer "Choose language" menu. Choosing a language reloads the page translated. */
export function LanguageSelect({ inverted = true }: { inverted?: boolean }) {
  const [language, setLanguage] = useState(SOURCE_LANGUAGE);

  useEffect(() => setLanguage(languageFromCookie(document.cookie)), []);

  function choose(code: string) {
    // Translation needs preference cookies (Google Translate sets its own). Ask first if they were refused.
    if (code !== SOURCE_LANGUAGE && !readConsent()?.preferences) {
      const ok = window.confirm("Showing the site in another language uses Google Translate, which sets cookies. Allow preference cookies?");
      if (!ok) {
        setLanguage(SOURCE_LANGUAGE);
        return;
      }
      saveConsent(true);
    }
    setLanguage(code);
    writeCookie(code === SOURCE_LANGUAGE ? null : `/${SOURCE_LANGUAGE}/${code}`);
    window.location.reload();
  }

  return (
    <div className="notranslate" translate="no">
      <label
        htmlFor="language-select"
        className={`mb-3 block text-sm font-semibold uppercase tracking-widest ${inverted ? "text-accent-400" : "text-accent-700"}`}
      >
        Choose language
      </label>
      <div className="relative max-w-60">
        <select
          id="language-select"
          value={language}
          onChange={(e) => choose(e.target.value)}
          className={`min-h-11 w-full appearance-none rounded-lg border px-3 pr-10 text-sm font-semibold ${
            inverted ? "border-white/40 bg-brand-900 text-white" : "border-brand-200 bg-white text-brand-900"
          }`}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${inverted ? "text-white" : "text-brand-700"}`}
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </div>
      <p className={`mt-2 text-xs ${inverted ? "text-brand-200" : "text-muted"}`}>Translated automatically by Google (uses cookies).</p>
    </div>
  );
}
