import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Secrets for the Drive connection, derived from GOOGLE_CLIENT_SECRET (kept in
 * Vercel, never in the database). The stored Google sign-in is encrypted with it,
 * so a copy of the database alone can't open the company Drive.
 */
function key(purpose: string) {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not set");
  return createHash("sha256").update(`chase-drive:${purpose}:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key("token"), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(sealed: string): string {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key("token"), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

/** A signed, short-lived note passed to the browser during an upload (it can't be changed). */
export function signTicket(data: object): string {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const mac = createHmac("sha256", key("ticket")).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function readTicket<T>(ticket: string): T | null {
  const [body, mac] = ticket.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", key("ticket")).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp?: number };
  if (data.exp && Date.now() > data.exp) return null;
  return data;
}
