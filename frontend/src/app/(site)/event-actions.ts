"use server";

import { redirect } from "next/navigation";
import { sendRegistrationConfirmation } from "@/lib/email/events-send";
import { getServerClient } from "@/lib/supabase/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Right after someone registers on the website: email their confirmation (once). */
export async function confirmRegistration(id: string) {
  if (typeof id !== "string" || !UUID.test(id)) return;
  await sendRegistrationConfirmation(id);
}

/** "I can't come any more", from the link in the confirmation email. */
export async function cancelRegistration(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!UUID.test(token)) redirect("/events/cancel/invalid");
  const supabase = getServerClient();
  const { data } = supabase ? await supabase.rpc("cancel_event_registration", { registration_token: token }) : { data: null };
  redirect(`/events/cancel/${token}?done=${data ? "1" : "0"}`);
}
