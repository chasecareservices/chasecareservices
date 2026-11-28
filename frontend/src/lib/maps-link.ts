import "server-only";
import { parseLatLng } from "@/lib/care";

/**
 * Google Maps "Share" links (maps.app.goo.gl/…) hide the coordinates. Follow the
 * redirects (Google hosts only, up to 4 hops, 5 seconds) to find them.
 */
export async function resolveShortMapsLink(text: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return text;
  }
  const google = (h: string) => /(^|\.)(goo\.gl|google\.com|google\.com\.gh|app\.goo\.gl)$/.test(h);
  if (!/^(maps\.app\.goo\.gl|goo\.gl)$/.test(url.hostname)) return text;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      const next = res.headers.get("location");
      if (!next) break;
      url = new URL(next, url);
      if (!google(url.hostname)) break;
      if (parseLatLng(url.toString())) return url.toString();
    }
  } catch {
    /* offline or blocked: fall through to the friendly error */
  }
  return url.toString();
}
