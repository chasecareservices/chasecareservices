import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type TypedClient = SupabaseClient<Database>;

/** Seconds that public content is cached before being refreshed from Supabase. */
export const CONTENT_REVALIDATE_SECONDS = 300;

function readConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured(): boolean {
  return readConfig() !== null;
}

/**
 * Read-only client for public content in Server Components.
 * Uses the publishable key, so the database's Row Level Security decides what
 * is visible (published content only). Responses are cached by Next.js.
 * Returns null when Supabase is not configured (e.g. a CI build without env vars).
 */
export function getServerClient(): TypedClient | null {
  const config = readConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: CONTENT_REVALIDATE_SECONDS } }),
    },
  });
}

/** Like getServerClient, but never cached: for answers that must be current (e.g. checking a certificate). */
export function getLiveServerClient(): TypedClient | null {
  const config = readConfig();
  if (!config) return null;
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

let browserClient: TypedClient | null = null;

/** Client for the browser (forms). Same publishable key; never use the secret key here. */
export function getBrowserClient(): TypedClient {
  const config = readConfig();
  if (!config) {
    throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  browserClient ??= createClient<Database>(config.url, config.key);
  return browserClient;
}
