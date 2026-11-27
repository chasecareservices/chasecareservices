"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyWellbeingRequest } from "@/lib/email/notify";
import { requireWorker } from "@/lib/portal/session";
import { validateRequest } from "@/lib/wellbeing";

type Result = { error: string } | undefined;

/** A care worker asks the wellbeing team for support, in confidence. */
export async function askForSupport(formData: FormData): Promise<Result> {
  const worker = await requireWorker();
  const checked = validateRequest({
    kind: String(formData.get("kind") ?? ""),
    urgency: String(formData.get("urgency") ?? ""),
    contact_method: String(formData.get("contact_method") ?? ""),
    contact_times: String(formData.get("contact_times") ?? ""),
    message: String(formData.get("message") ?? ""),
  });
  if ("error" in checked) return checked;
  const { data, error } = await worker.supabase
    .from("wellbeing_requests")
    .insert({ ...checked.value, worker_id: worker.user.id })
    .select("id")
    .single();
  if (error || !data) return { error: "Your request couldn't be sent. Check your connection and try again, or call the office." };
  await notifyWellbeingRequest(data.id).catch(() => undefined);
  revalidatePath("/portal/wellbeing");
  redirect(`/portal/wellbeing/${data.id}?sent=1`);
}

/** The care worker replies on their own request. */
export async function replyToWellbeing(formData: FormData): Promise<Result> {
  const worker = await requireWorker();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "Something went wrong. Please reload the page." };
  if (!body) return { error: "Write your message first." };
  const { error } = await worker.supabase.from("wellbeing_messages").insert({ request_id: id, body, author_id: worker.user.id });
  if (error) return { error: "Your message couldn't be sent. If this request is closed, please ask for support again." };
  revalidatePath(`/portal/wellbeing/${id}`);
  redirect(`/portal/wellbeing/${id}?replied=1#conversation`);
}
