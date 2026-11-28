import "server-only";
import type { Copy } from "@/lib/email/templates";
import { createSecretClient } from "@/lib/supabase/server-auth";

/** The owner's wording for an automatic email (Communications → Email templates), or null for the built-in one. */
export async function getEmailCopy(key: string): Promise<Partial<Copy> | null> {
  const admin = createSecretClient();
  if (!admin) return null;
  const { data } = await admin.from("email_templates").select("subject, heading, message").eq("key", key).maybeSingle();
  return data ? { subject: data.subject ?? "", heading: data.heading ?? "", message: data.message ?? "" } : null;
}
