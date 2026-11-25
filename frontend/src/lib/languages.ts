/**
 * Languages offered in the footer's "Choose language" menu.
 * Translation is done by Google Translate (machine translation), so wording may not be perfect.
 * Codes are Google Translate's language codes.
 */
export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ak", label: "Twi (Akan)" },
  { code: "gaa", label: "Ga" },
  { code: "ee", label: "Eʋegbe (Ewe)" },
  { code: "ha", label: "Hausa" },
  { code: "fr", label: "Français (French)" },
  { code: "ar", label: "العربية (Arabic)" },
];

export const SOURCE_LANGUAGE = "en";

/** Name of the cookie Google Translate reads, e.g. "/en/ak". */
export const TRANSLATE_COOKIE = "googtrans";

/** The chosen language from a cookie string, or "en". Unknown languages fall back to English. */
export function languageFromCookie(cookieHeader: string): string {
  const match = cookieHeader.match(/(?:^|;\s*)googtrans=([^;]*)/);
  const target = match ? decodeURIComponent(match[1]).split("/").pop() ?? "" : "";
  return LANGUAGES.some((l) => l.code === target) ? target : SOURCE_LANGUAGE;
}

/** Domains the cookie must be written to / cleared from so Google Translate sees it everywhere. */
export function cookieDomains(hostname: string): (string | null)[] {
  const parts = hostname.split(".");
  const isIp = /^\d+(\.\d+){3}$/.test(hostname);
  if (isIp || parts.length < 2) return [null];
  // null = host-only cookie; then the parent domain (e.g. .chasecareservices.org) for subdomains like www.
  return [null, `.${parts.slice(-2).join(".")}`];
}
