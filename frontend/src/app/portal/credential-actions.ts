"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DOC_TYPES } from "@/lib/credentials";
import { requireWorker } from "@/lib/portal/session";

type Result = { error: string } | undefined;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A care worker sends renewed details; the office checks them. */
export async function sendRenewal(formData: FormData): Promise<Result> {
  const worker = await requireWorker();
  const type = String(formData.get("doc_type") ?? "");
  const expires = String(formData.get("expires_on") ?? "");
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 100) || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  if (!DOC_TYPES.some((d) => d.value === type) || type === "other") return { error: "Choose which document it is." };
  if (expires && !DATE.test(expires)) return { error: "Check the expiry date." };
  if (expires && expires <= new Date().toISOString().slice(0, 10)) return { error: "The new expiry date should be in the future." };
  const { error } = await worker.supabase.from("worker_credentials").insert({ worker_id: worker.user.id, doc_type: type, reference, expires_on: expires || null, note });
  if (error) return { error: "That couldn't be sent. Please try again, or bring it to the office." };
  revalidatePath("/portal", "layout");
  redirect("/portal/documents?sent=1");
}
