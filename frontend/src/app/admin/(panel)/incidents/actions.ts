"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { incidentFromForm } from "@/components/care/IncidentFields";
import { requirePermission } from "@/lib/admin/session";
import { notifyIncident } from "@/lib/email/notify";
import { validateIncident } from "@/lib/incidents";

type Result = { error: string } | undefined;

/** The office logs an incident it was told about (by phone, by a family, etc.). */
export async function logIncident(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const checked = validateIncident(incidentFromForm(formData));
  if ("error" in checked) return checked;
  const { data, error } = await staff.supabase
    .from("care_incidents")
    .insert({ ...checked.value, reported_by: staff.user.id })
    .select("id")
    .single();
  if (error || !data) return { error: "The incident could not be saved. Please try again." };
  await notifyIncident(data.id).catch(() => undefined);
  revalidatePath("/admin", "layout");
  redirect(`/admin/incidents/${data.id}?saved=1`);
}

/** Moves an incident along (new → being followed up → closed) and keeps the office's notes. */
export async function followUpIncident(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const office_notes = String(formData.get("office_notes") ?? "").trim().slice(0, 4000) || null;
  if (!["open", "investigating", "closed"].includes(status)) return { error: "Choose where this incident stands." };
  if (status === "closed" && !office_notes) return { error: "Before closing, note what was done and what will stop it happening again." };
  const { error } = await staff.supabase
    .from("care_incidents")
    .update({ status: status as "open" | "investigating" | "closed", office_notes })
    .eq("id", id);
  if (error) return { error: "The follow-up could not be saved. Please try again." };
  revalidatePath("/admin", "layout");
  redirect(`/admin/incidents/${id}?saved=followup`);
}
