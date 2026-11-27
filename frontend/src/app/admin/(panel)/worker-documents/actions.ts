"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { DOC_TYPES } from "@/lib/credentials";
import { runCredentialReminders } from "@/lib/credentials-reminders";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;
const backTo = (f: FormData, fallback: string) => {
  const r = String(f.get("return_to") ?? "");
  return /^\/admin\/(care-workers\/[0-9a-f-]{36}|worker-documents)$/.test(r) ? r : fallback;
};

function readDates(f: FormData): { issued: string | null; expires: string | null } | { error: string } {
  const issued = String(f.get("issued_on") ?? "");
  const expires = String(f.get("expires_on") ?? "");
  if ((issued && !DATE.test(issued)) || (expires && !DATE.test(expires))) return { error: "Check the dates." };
  if (issued && expires && expires <= issued) return { error: "The expiry date must be after the issue date." };
  return { issued: issued || null, expires: expires || null };
}

/** The office records a document it has seen (checked straight away, or left to check later). */
export async function addCredential(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const worker = String(formData.get("worker_id") ?? "");
  const type = String(formData.get("doc_type") ?? "");
  if (!UUID.test(worker)) return { error: "Something went wrong. Please reload the page." };
  if (!DOC_TYPES.some((d) => d.value === type)) return { error: "Choose the type of document." };
  if (type === "other" && !text(formData, "title", 120)) return { error: "Give the document a name." };
  const dates = readDates(formData);
  if ("error" in dates) return dates;
  const { error } = await staff.supabase.from("worker_credentials").insert({
    worker_id: worker,
    doc_type: type,
    title: type === "other" ? text(formData, "title", 120) : null,
    reference: text(formData, "reference", 100),
    issued_on: dates.issued,
    expires_on: dates.expires,
    note: text(formData, "note", 300),
    status: formData.get("verified") === "on" ? "verified" : "pending",
  });
  if (error) return { error: "The document couldn't be saved. Please try again." };
  revalidatePath("/admin", "layout");
  redirect(`${backTo(formData, `/admin/care-workers/${worker}`)}?saved=doc-added#checks`);
}

/** Accept (optionally correcting the expiry) or reject details a care worker sent. */
export async function reviewCredential(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!UUID.test(id) || !["verified", "rejected"].includes(decision)) return { error: "Something went wrong. Please reload the page." };
  const dates = readDates(formData);
  if ("error" in dates) return dates;
  const note = text(formData, "note", 300);
  if (decision === "rejected" && !note) return { error: "Say why it wasn't accepted, so the care worker knows what to send." };
  const { data, error } = await staff.supabase
    .from("worker_credentials")
    .update({ status: decision, ...(dates.expires ? { expires_on: dates.expires } : {}), ...(dates.issued ? { issued_on: dates.issued } : {}), note })
    .eq("id", id)
    .select("worker_id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath("/admin", "layout");
  redirect(`${backTo(formData, `/admin/care-workers/${data.worker_id}`)}?saved=${decision}#checks`);
}

export async function deleteCredential(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const { data, error } = await staff.supabase.from("worker_credentials").delete().eq("id", id).select("worker_id").maybeSingle();
  if (error || !data) return { error: "Couldn't remove it." };
  revalidatePath("/admin", "layout");
  redirect(`${backTo(formData, `/admin/care-workers/${data.worker_id}`)}?saved=doc-removed#checks`);
}

/** The same as the daily automatic run, on demand. */
export async function sendRemindersNow(): Promise<Result> {
  await requirePermission("workforce.edit");
  const h = await headers();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`).replace(/\/$/, "");
  const r = await runCredentialReminders(site);
  if (r.skipped === "not-configured") return { error: "Email isn't switched on yet, so reminders can't be sent. See Site settings → Email alerts." };
  if (r.skipped === "no-key") return { error: "Reminders aren't set up yet: the site's secret key is missing." };
  redirect(`/admin/worker-documents?saved=reminded&n=${r.workersEmailed}&d=${r.documents}`);
}
