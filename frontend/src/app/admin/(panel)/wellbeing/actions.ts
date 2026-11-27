"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { notifyWellbeingReply } from "@/lib/email/notify";
import { REQUEST_STATUS } from "@/lib/wellbeing";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;

/** Status, who is looking after it, and the service it was referred to. */
export async function updateWellbeingRequest(formData: FormData): Promise<Result> {
  const staff = await requirePermission("wellbeing.edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const serviceId = String(formData.get("service_id") ?? "");
  const assign = String(formData.get("assigned_to") ?? "");
  if (!UUID.test(id) || !REQUEST_STATUS.some((s) => s.value === status)) return { error: "Something went wrong. Please reload the page." };
  if (status === "referred" && !UUID.test(serviceId)) return { error: "Choose the service you referred them to." };
  const { error } = await staff.supabase
    .from("wellbeing_requests")
    .update({
      status,
      service_id: UUID.test(serviceId) ? serviceId : null,
      assigned_to: assign === "me" ? staff.user.id : UUID.test(assign) ? assign : null,
    })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath("/admin", "layout");
  redirect(`/admin/wellbeing/${id}?saved=status`);
}

/** A message to the care worker (they get an email saying there's a message), or an internal note. */
export async function addWellbeingMessage(formData: FormData): Promise<Result> {
  const staff = await requirePermission("wellbeing.edit");
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const internal = formData.get("internal") === "1";
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  if (!body) return { error: internal ? "Write the note first." : "Write your message first." };
  const { error } = await staff.supabase.from("wellbeing_messages").insert({ request_id: id, body, internal, author_id: staff.user.id });
  if (error) return { error: "Couldn't save. Please try again." };
  if (!internal) {
    // First reply moves a new request on, so the inbox shows it is being handled.
    await staff.supabase.from("wellbeing_requests").update({ status: "in_progress", assigned_to: staff.user.id }).eq("id", id).eq("status", "new");
    await notifyWellbeingReply(id).catch(() => undefined);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/wellbeing/${id}?saved=${internal ? "note" : "message"}#conversation`);
}
