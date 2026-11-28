"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";

type Result = { error: string } | undefined;

export async function saveSecurity(formData: FormData): Promise<Result> {
  const staff = await requirePermission("users.edit");
  const idle = Number(formData.get("idle") ?? 30);
  const keep = String(formData.get("retention") ?? "24");
  if (!Number.isInteger(idle) || idle < 5 || idle > 480) return { error: "Sign-out time must be between 5 and 480 minutes." };
  const months = keep === "off" ? null : Number(keep);
  if (months !== null && (!Number.isInteger(months) || months < 6 || months > 120)) return { error: "Choose how long to keep old enquiries." };
  const { error } = await staff.supabase.rpc("set_security_options", { idle_minutes: idle, retention_months: months as number });
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/admin", "layout");
  redirect("/admin/security?saved=settings");
}

export async function endSessions(formData: FormData): Promise<Result> {
  const staff = await requirePermission("users.edit");
  const user = String(formData.get("user") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(user)) return { error: "Something went wrong." };
  const { data, error } = await staff.supabase.rpc("end_user_sessions", { target: user });
  if (error) return { error: "Couldn't sign them out. Please try again." };
  if (user === staff.user.id) redirect("/admin/login");
  redirect(`/admin/security?saved=ended&n=${data ?? 0}`);
}

export async function runRetention(): Promise<Result> {
  const staff = await requirePermission("users.edit");
  const { data, error } = await staff.supabase.rpc("apply_retention");
  if (error) return { error: "Couldn't run the clean-up. Please try again." };
  const r = (data ?? {}) as { enquiries?: number; newsletter?: number; event_registrations?: number; skipped?: string };
  redirect(`/admin/security?saved=retention&e=${r.enquiries ?? 0}&s=${r.newsletter ?? 0}&r=${r.event_registrations ?? 0}${r.skipped ? "&off=1" : ""}`);
}
