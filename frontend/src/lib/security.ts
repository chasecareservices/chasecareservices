/** Security page helpers. No server code: unit tested. */

export const AUTH_ACTIONS: Record<string, string> = {
  login: "Signed in",
  logout: "Signed out",
  user_recovery_requested: "Asked for a password reset",
  user_updated_password: "Changed password",
  user_invited: "Invited",
  user_signedup: "Set up account",
  token_revoked: "Session ended",
};

/** "Chrome on Windows", "Safari on iPhone"… from a user-agent string. */
export function deviceLabel(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua) ? (/iPad/.test(ua) ? "iPad" : "iPhone") : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return os ? `${browser} on ${os}` : browser;
}

export const RETENTION_CHOICES = [
  { value: "12", label: "1 year" },
  { value: "24", label: "2 years" },
  { value: "36", label: "3 years" },
  { value: "60", label: "5 years" },
  { value: "off", label: "Keep them (no automatic clean-up)" },
];
