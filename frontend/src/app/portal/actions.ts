"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateReport, type ReportErrors, type ReportInput } from "@/lib/care";
import { requireWorker } from "@/lib/portal/session";
import { createAuthClient } from "@/lib/supabase/server-auth";

export type SaveResult = { errors?: ReportErrors; message?: string } | undefined;

function friendly(message: string) {
  if (/already been read/i.test(message)) return "The office has already read this report, so it can't be changed. Please call the office.";
  if (/row-level security|permission/i.test(message)) return "You can only write reports for the people you are assigned to. Please call the office if this looks wrong.";
  return "Your report could not be sent. Check your connection and try again — nothing you typed has been lost.";
}

const columns = (v: ReportInput) => ({
  client_id: v.client_id,
  visit_date: v.visit_date,
  start_time: v.start_time || null,
  end_time: v.end_time || null,
  mood: v.mood as "great" | "good" | "okay" | "low" | "distressed",
  activities: v.activities,
  meals: v.meals || null,
  medication: v.medication || null,
  summary: v.summary,
  concern_level: v.concern_level as "none" | "monitor" | "urgent",
  concerns: v.concerns || null,
});

export async function submitReport(input: ReportInput): Promise<SaveResult> {
  const worker = await requireWorker();
  const { errors, value } = validateReport(input);
  if (!value) return { errors };
  const { data, error } = await worker.supabase.from("care_reports").insert(columns(value)).select("id").single();
  if (error || !data) return { message: friendly(error?.message ?? "") };
  revalidatePath("/portal", "layout");
  redirect(`/portal/report/${data.id}?sent=1`);
}

export async function updateReport(id: string, input: ReportInput): Promise<SaveResult> {
  const worker = await requireWorker();
  const { errors, value } = validateReport(input);
  if (!value) return { errors };
  const { data, error } = await worker.supabase.from("care_reports").update(columns(value)).eq("id", id).select("id");
  if (error) return { message: friendly(error.message) };
  if (!data?.length) return { message: "The office has already read this report, so it can't be changed. Please call the office." };
  revalidatePath("/portal", "layout");
  redirect(`/portal/report/${id}?updated=1`);
}

export async function signOutWorker() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
