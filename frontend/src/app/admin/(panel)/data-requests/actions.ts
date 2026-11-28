"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const KINDS = ["access", "erasure", "correction", "objection", "other"];

export async function addRequest(formData: FormData): Promise<Result> {
  const staff = await requirePermission("users.edit");
  const name = String(formData.get("person_name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("person_email") ?? "").trim().toLowerCase().slice(0, 254);
  const kind = String(formData.get("kind") ?? "");
  const received = String(formData.get("received_on") ?? "");
  if (name.length < 2) return { error: "Enter the person's name." };
  if (email && !EMAIL.test(email)) return { error: "Check the email address." };
  if (!KINDS.includes(kind)) return { error: "Choose what they asked for." };
  const day = /^\d{4}-\d{2}-\d{2}$/.test(received) ? received : new Date().toISOString().slice(0, 10);
  const due = new Date(Date.parse(`${day}T00:00:00Z`) + 30 * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await staff.supabase
    .from("data_requests")
    .insert({ person_name: name, person_email: email || null, kind, details: String(formData.get("details") ?? "").trim().slice(0, 2000) || null, received_on: day, due_on: due })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save. Please try again." };
  redirect(`/admin/data-requests/${data.id}?saved=added`);
}

export async function closeRequest(formData: FormData): Promise<Result> {
  const staff = await requirePermission("users.edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const outcome = String(formData.get("outcome") ?? "").trim().slice(0, 2000);
  if (!UUID.test(id) || !["open", "done", "declined"].includes(status)) return { error: "Something went wrong." };
  if (status !== "open" && !outcome) return { error: "Write what was done (or why it was declined)." };
  const { error } = await staff.supabase
    .from("data_requests")
    .update({ status, outcome: outcome || null, handled_by: staff.user.id, completed_at: status === "open" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/admin/data-requests");
  redirect(`/admin/data-requests/${id}?saved=status`);
}

/** Erases the person's website data. The email must be typed again to confirm. */
export async function erasePerson(formData: FormData): Promise<Result> {
  const staff = await requirePermission("users.edit");
  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const confirmEmail = String(formData.get("confirm_email") ?? "").trim().toLowerCase();
  if (!UUID.test(id) || !EMAIL.test(email)) return { error: "Something went wrong." };
  if (confirmEmail !== email) return { error: "Type the email address exactly to confirm." };
  const { data, error } = await staff.supabase.rpc("erase_person", { lookup: email });
  if (error) return { error: "The data couldn't be erased. Please try again." };
  const r = (data ?? {}) as { enquiries?: number; newsletter?: number; event_registrations?: number; job_applications?: number; has_account?: boolean };
  const summary = `Erased: ${r.enquiries ?? 0} enquiries, newsletter ${r.newsletter ? "sign-up" : "(none)"}, ${r.event_registrations ?? 0} event registrations, ${r.job_applications ?? 0} job applications.${r.has_account ? " Account kept (care records must be retained): deactivate it in Staff & roles if needed." : ""}`;
  const { data: cur } = await staff.supabase.from("data_requests").select("outcome").eq("id", id).maybeSingle();
  await staff.supabase.from("data_requests").update({ outcome: [cur?.outcome, `${new Date().toISOString().slice(0, 10)}: ${summary}`].filter(Boolean).join("\n") }).eq("id", id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/data-requests/${id}?saved=erased`);
}
