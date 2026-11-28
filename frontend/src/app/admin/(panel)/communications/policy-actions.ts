"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/admin/session";

type Result = { error: string } | undefined;

async function editor() {
  const staff = await requireStaff();
  if (!staff.can("communications.edit") && !staff.can("workforce.edit")) return null;
  return staff;
}

export async function savePolicy(formData: FormData): Promise<Result> {
  const staff = await editor();
  if (!staff) return { error: "You don't have permission to change policies." };
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const url = String(formData.get("document_url") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  if (title.length < 2) return { error: "Give the policy a title." };
  if (url && !/^https:\/\/\S+$/i.test(url)) return { error: "The document link must start with https://" };
  if (!["draft", "published", "archived"].includes(status)) return { error: "Choose a status." };
  const values = {
    title,
    category: String(formData.get("category") ?? "").trim().slice(0, 80) || null,
    summary: String(formData.get("summary") ?? "").trim().slice(0, 600) || null,
    body: String(formData.get("body") ?? "").trim().slice(0, 60000) || null,
    document_url: url || null,
    must_read: formData.get("must_read") === "on",
    status,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    updated_by: staff.user.id,
  };
  if (!values.body && !values.document_url) return { error: "Add the policy text or a link to the document." };
  let saved: string | null = null;
  if (id) {
    const { data: cur } = await staff.supabase.from("policies").select("version, status").eq("id", id).maybeSingle();
    if (!cur) return { error: "Policy not found." };
    const bump = formData.get("new_version") === "on" && cur.status === "published" && status === "published";
    const { error } = await staff.supabase.from("policies").update({ ...values, version: bump ? cur.version + 1 : cur.version }).eq("id", id);
    if (error) return { error: "Couldn't save. Please try again." };
    saved = id;
  } else {
    const { data, error } = await staff.supabase.from("policies").insert(values).select("id").single();
    if (error || !data) return { error: "Couldn't save. Please try again." };
    saved = data.id;
  }
  revalidatePath("/portal", "layout");
  redirect(`/admin/communications/policies/${saved}?saved=1`);
}
