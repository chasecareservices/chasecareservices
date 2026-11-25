"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import type { Database } from "@/lib/database.types";

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
