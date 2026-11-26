import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  return { url, key };
}

/**
 * Supabase client acting as the signed-in staff member (session in secure cookies).
 * Every query runs with their rights, so Row Level Security applies.
 */
export async function createAuthClient() {
  const { url, key } = config();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes cookies instead.
        }
      },
    },
  });
}

/**
 * Admin client using the SECRET key — server only, and only after the caller's own
 * permission has been checked. Used for things the database API cannot do for a user,
 * such as inviting staff or reading staff email addresses.
 */
export function createSecretClient() {
  const { url } = config();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return null;
  return createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
