"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Books a visit, optionally repeating on the same weekday for up to 12 weeks. */
export async function bookVisit(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const client_id = String(formData.get("client_id") ?? "");
  const worker_id = String(formData.get("worker_id") ?? "");
  const date = String(formData.get("shift_date") ?? "");
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const weeks = Math.min(12, Math.max(1, Number(formData.get("repeat_weeks") ?? 1) || 1));
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500) || null;
  if (!UUID.test(client_id)) return { error: "Choose the client." };
  if (!UUID.test(worker_id)) return { error: "Choose the care worker." };
  if (!DATE.test(date)) return { error: "Choose the date of the visit." };
  if (!TIME.test(start) || !TIME.test(end)) return { error: "Enter the start and finish times, like 09:00." };
  if (end <= start) return { error: "The finish time must be after the start time." };

  const rows = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7 * i);
    return { client_id, worker_id, shift_date: d.toISOString().slice(0, 10), start_time: start, end_time: end, notes, created_by: staff.user.id };
  });
  const { error } = await staff.supabase.from("care_shifts").insert(rows);
  if (error) return { error: "The visit could not be booked. Please try again." };

  // Booking someone puts them on the client's care team, so they can see the care plan
  // and send reports. (Nothing to do separately on the client's page.)
  let teamNote = "";
  if (staff.can("clients.edit")) {
    const { data: before } = await staff.supabase
      .from("care_assignments")
      .select("is_active")
      .eq("client_id", client_id)
      .eq("worker_id", worker_id)
      .maybeSingle();
    if (!before?.is_active) {
      const { error: teamError } = await staff.supabase
        .from("care_assignments")
        .upsert({ client_id, worker_id, is_active: true }, { onConflict: "client_id,worker_id" });
      if (!teamError) teamNote = "&team=added";
    }
  }
  revalidatePath("/admin/care-schedule");
  revalidatePath("/portal", "layout");
  redirect(`/admin/care-schedule?week=${date}&saved=${weeks}${teamNote}`);
}

export async function cancelVisit(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const id = String(formData.get("id") ?? "");
  const week = String(formData.get("week") ?? "");
  const { error } = await staff.supabase.from("care_shifts").update({ status: "cancelled" }).eq("id", id);
  if (error) return { error: "The visit could not be cancelled." };
  revalidatePath("/admin/care-schedule");
  revalidatePath("/portal", "layout");
  redirect(`/admin/care-schedule?week=${DATE.test(week) ? week : ""}&saved=cancelled`);
}
