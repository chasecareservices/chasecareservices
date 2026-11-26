"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import type { Database } from "@/lib/database.types";
import { cleanDigitalAddress } from "@/lib/ghana-address";

type Status = Database["public"]["Enums"]["enquiry_status"];
const STATUSES: Status[] = ["new", "in_progress", "contacted", "converted", "closed"];

export async function updateEnquiryStatus(formData: FormData) {
  const staff = await requirePermission("enquiries.edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  if (!id || !STATUSES.includes(status)) redirect(`/admin/enquiries/${id}?error=status`);
  const { error } = await staff.supabase.from("enquiries").update({ status }).eq("id", id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/enquiries/${id}?${error ? "error=save" : "saved=status"}`);
}

export async function addEnquiryNote(formData: FormData) {
  const staff = await requirePermission("enquiries.edit");
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!id || !body) redirect(`/admin/enquiries/${id}?error=note`);
  const { error } = await staff.supabase.from("enquiry_notes").insert({ enquiry_id: id, body: body.slice(0, 5000), author_id: staff.user.id });
  redirect(`/admin/enquiries/${id}?${error ? "error=save" : "saved=note"}#notes`);
}

/**
 * Turns a website care request into a client record (the office checks and edits the
 * details first). Marks the request "converted" and notes who did it.
 */
export async function createClientFromEnquiry(formData: FormData): Promise<{ error: string } | undefined> {
  const staff = await requirePermission("clients.create");
  if (!staff.can("enquiries.edit")) return { error: "You need permission to update enquiries as well." };
  const enquiryId = String(formData.get("enquiry_id") ?? "");
  const s = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max) || null;
  const fullName = s("full_name", 120);
  if (!fullName || fullName.length < 2) return { error: "Enter the full name of the person who needs care." };
  const digital = cleanDigitalAddress(String(formData.get("digital_address") ?? ""));
  if (digital === undefined) return { error: "The Ghana Post digital address should look like GA-183-8164." };
  const lat = Number(formData.get("home_lat"));
  const lng = Number(formData.get("home_lng"));
  const hasHome = String(formData.get("home_lat") ?? "") !== "" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const { data: client, error } = await staff.supabase
    .from("care_clients")
    .insert({
      full_name: fullName,
      preferred_name: s("preferred_name", 60),
      area: s("area", 120),
      address: s("address", 300),
      digital_address: digital,
      care_summary: s("care_summary", 2000),
      emergency_contact_name: s("emergency_contact_name", 120),
      emergency_contact_phone: s("emergency_contact_phone", 40),
      home_lat: hasHome ? lat : null,
      home_lng: hasHome ? lng : null,
      source_enquiry_id: enquiryId,
      updated_by: staff.user.id,
    })
    .select("id")
    .single();
  if (error || !client) {
    return { error: error?.code === "23505" ? "A client record has already been created from this request." : "The client record could not be created. Please try again." };
  }
  await Promise.all([
    staff.supabase.from("enquiries").update({ status: "converted" }).eq("id", enquiryId),
    staff.supabase.from("enquiry_notes").insert({ enquiry_id: enquiryId, body: `Client record created: ${fullName}.`, author_id: staff.user.id }),
  ]);
  revalidatePath("/admin", "layout");
  redirect(`/admin/care-clients/${client.id}?saved=from-enquiry`);
}
