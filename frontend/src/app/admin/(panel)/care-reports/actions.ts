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
