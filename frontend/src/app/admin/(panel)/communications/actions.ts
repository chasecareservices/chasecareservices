"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { templateDef, unknownPlaceholders } from "@/lib/email/templates";

type Result = { error: string } | undefined;
const clip = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function saveTemplate(formData: FormData): Promise<Result> {
  const staff = await requirePermission("communications.edit");
  const key = String(formData.get("key") ?? "");
  if (!templateDef(key)) return { error: "Unknown email." };
  const subject = clip(formData, "subject", 200);
  const heading = clip(formData, "heading", 200);
  const message = clip(formData, "message", 2000);
  const bad = unknownPlaceholders(key, [subject, heading, message]);
  if (bad.length) return { error: `This email can't fill in ${bad.map((b) => `{${b}}`).join(", ")}. Use only the placeholders listed.` };
  const { error } = await staff.supabase.from("email_templates").upsert({ key, subject: subject || null, heading: heading || null, message: message || null, updated_by: staff.user.id });
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/admin/communications/templates");
  redirect(`/admin/communications/templates/${key}?saved=1`);
}

export async function resetTemplate(formData: FormData): Promise<Result> {
  const staff = await requirePermission("communications.edit");
  const key = String(formData.get("key") ?? "");
  if (!templateDef(key)) return { error: "Unknown email." };
  const { error } = await staff.supabase.from("email_templates").delete().eq("key", key);
  if (error) return { error: "Couldn't reset. Please try again." };
  revalidatePath("/admin/communications/templates");
  redirect(`/admin/communications/templates/${key}?saved=reset`);
}
