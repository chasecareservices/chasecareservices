/**
 * The visitor's cookie choice, kept in one small first-party cookie.
 *
 * Categories (keep in step with src/lib/legal/cookie-policy.ts):
 *   necessary    always on: signing in, remembering this choice
 *   preferences  optional: the language menu (Google Translate sets its own cookies)
 * The site has no analytics or advertising cookies. If any are added, add a
 * category here, ask for it in the banner, and bump CONSENT_VERSION so everyone
 * is asked again.
 */
export const CONSENT_COOKIE = "chase_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // ask again after 6 months
export const OPEN_SETTINGS_EVENT = "chase:cookie-settings";

export type Consent = { preferences: boolean; at: string };

export function serializeConsent(c: Consent) {
  return encodeURIComponent(`${CONSENT_VERSION}|${c.preferences ? 1 : 0}|${c.at}`);
}

/** The saved choice, or null if none (or from an older version of the banner). */
export function parseConsent(cookieHeader: string): Consent | null {
  const raw = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const [version, prefs, at] = decoded.split("|");
  if (Number(version) !== CONSENT_VERSION || (prefs !== "0" && prefs !== "1") || !at) return null;
  return { preferences: prefs === "1", at };
}

/** Browser only: the saved choice. */
export function readConsent(): Consent | null {
  return typeof document === "undefined" ? null : parseConsent(document.cookie);
}

/** Browser only: saves the choice and tells the rest of the page. */
export function saveConsent(preferences: boolean) {
  const consent: Consent = { preferences, at: new Date().toISOString() };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(consent)}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("chase:consent", { detail: consent }));
  return consent;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
