"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { availabilityFromForm, TIME_OFF_KINDS } from "@/lib/matching";
import { requireWorker } from "@/lib/portal/session";

type Result = { error: string } | undefined;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveMyAvailability(formData: FormData): Promise<Result> {
  const worker = await requireWorker();
  const parsed = availabilityFromForm((k) => (formData.get(k) as string | null) ?? null);
  if ("error" in parsed) return parsed;
  const { error: delError } = await worker.supabase.from("worker_availability").delete().eq("worker_id", worker.user.id);
  if (delError) return { error: "Your availability couldn't be saved. Please try again." };
  if (parsed.rows.length) {
    const { error } = await worker.supabase.from("worker_availability").insert(parsed.rows.map((r) => ({ ...r, worker_id: worker.user.id })));
    if (error) return { error: "Your availability couldn't be saved. Please try again." };
  }
  revalidatePath("/portal/availability");
  redirect("/portal/availability?saved=week");
}

export async function addMyTimeOff(formData: FormData): Promise<Result> {
  const worker = await requireWorker();
  const from = String(formData.get("starts_on") ?? "");
  const to = String(formData.get("ends_on") ?? "") || from;
  const kind = String(formData.get("kind") ?? "leave");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (!DATE.test(from) || !DATE.test(to)) return { error: "Choose the first and last day." };
  if (to < from) return { error: "The last day can't be before the first day." };
  if (to < new Date().toISOString().slice(0, 10)) return { error: "Choose dates from today onwards." };
  if (!TIME_OFF_KINDS.some((k) => k.value === kind)) return { error: "Choose a reason." };
  const { error } = await worker.supabase.from("worker_time_off").insert({ worker_id: worker.user.id, starts_on: from, ends_on: to, kind, note });
  if (error) return { error: "That couldn't be saved. Please try again." };
  revalidatePath("/portal/availability");
  redirect("/portal/availability?saved=off");
}

export async function removeMyTimeOff(formData: FormData): Promise<Result> {
  const worker = await requireWorker();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "Something went wrong. Please reload the page." };
  const { error, count } = await worker.supabase.from("worker_time_off").delete({ count: "exact" }).eq("id", id).eq("worker_id", worker.user.id);
  if (error || !count) return { error: "Only time off that hasn't started yet can be removed. Call the office to change it." };
  revalidatePath("/portal/availability");
  redirect("/portal/availability?saved=removed");
}
