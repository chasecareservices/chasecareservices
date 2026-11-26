"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";

type Result = { error: string } | undefined;

export async function reviewReport(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("office_note") ?? "").trim().slice(0, 2000);
  const { data, error } = await staff.supabase
    .from("care_reports")
    .update({ status: "reviewed", office_note: note || null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "The report could not be updated. Please try again." };
  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");
  redirect(`/admin/care-reports/${id}?saved=1`);
}

/** Set the client's home to where a report was written (when the office knows the visit was at home). */
export async function setHomeFromReport(formData: FormData): Promise<Result> {
  const staff = await requirePermission("clients.edit");
  const reportId = String(formData.get("report_id") ?? "");
  const { data: r } = await staff.supabase
    .from("care_reports")
    .select("client_id, location_status, location_lat, location_lng")
    .eq("id", reportId)
    .maybeSingle();
  if (!r || r.location_status !== "captured" || r.location_lat == null || r.location_lng == null) return { error: "This report has no location to use." };
  const { error } = await staff.supabase.from("care_clients").update({ home_lat: r.location_lat, home_lng: r.location_lng }).eq("id", r.client_id);
  if (error) return { error: "The home location could not be saved. Please try again." };
  revalidatePath("/admin", "layout");
  redirect(`/admin/care-reports/${reportId}?saved=home`);
}
