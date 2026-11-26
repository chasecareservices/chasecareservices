"use server";

import { redirect } from "next/navigation";
import { notifyEnquiry } from "@/lib/email/notify";
import { requireFamily } from "@/lib/family/session";
import { createAuthClient } from "@/lib/supabase/server-auth";

export async function signOutFamily() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/family/login");
}

/** A family member sends the office a message. It arrives as an enquiry and is emailed to the office. */
export async function messageOffice(formData: FormData): Promise<{ error: string } | undefined> {
  const family = await requireFamily();
  const client = String(formData.get("client_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 2) return { error: "Write your message first." };
  if (message.length > 2000) return { error: "Please keep your message under 2000 characters." };
  const { data, error } = await family.supabase.rpc("family_message_office", { client, message });
  if (error || !data) {
    return { error: /Too many/i.test(error?.message ?? "") ? "You've sent a lot of messages today. Please call the office." : "Your message could not be sent. Please try again or call the office." };
  }
  await notifyEnquiry(data).catch(() => undefined);
  redirect("/family?sent=1#message");
}
