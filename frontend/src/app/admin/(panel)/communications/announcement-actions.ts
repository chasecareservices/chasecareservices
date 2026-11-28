"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { toIso } from "@/lib/admin/values";
import { announcementEmail } from "@/lib/email/alerts";
import { sendEmail } from "@/lib/email/send";
import { createSecretClient } from "@/lib/supabase/server-auth";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;

function read(f: FormData) {
  const title = String(f.get("title") ?? "").trim().slice(0, 150);
  const body = String(f.get("body") ?? "").trim().slice(0, 5000);
  const audience = String(f.get("audience") ?? "");
  const publishRaw = String(f.get("publish_at") ?? "");
  const expiresRaw = String(f.get("expires_at") ?? "");
  if (title.length < 2) return { error: "Give it a title." } as const;
  if (body.length < 2) return { error: "Write the message." } as const;
  if (!["workers", "families", "both"].includes(audience)) return { error: "Choose who it's for." } as const;
  const publish_at = publishRaw ? toIso(publishRaw) : new Date().toISOString();
  const expires_at = expiresRaw ? toIso(expiresRaw) : null;
  if (!publish_at || (expiresRaw && !expires_at)) return { error: "Check the dates." } as const;
  if (expires_at && expires_at <= publish_at) return { error: "The end date must be after the start." } as const;
  return {
    value: { title, body, audience, publish_at, expires_at, important: f.get("important") === "on", status: f.get("status") === "published" ? "published" : "draft" },
  } as const;
}

export async function saveAnnouncement(formData: FormData): Promise<Result> {
  const staff = await requirePermission("communications.edit");
  const id = String(formData.get("id") ?? "");
  const r = read(formData);
  if (!("value" in r) || !r.value) return { error: r.error ?? "Please check the form." };
  const { data, error } = id
    ? await staff.supabase.from("portal_announcements").update(r.value).eq("id", id).select("id").maybeSingle()
    : await staff.supabase.from("portal_announcements").insert({ ...r.value, created_by: staff.user.id }).select("id").single();
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath("/portal", "layout");
  revalidatePath("/family", "layout");
  redirect(`/admin/communications/announcements/${data.id}?saved=1`);
}

export async function deleteAnnouncement(formData: FormData): Promise<Result> {
  const staff = await requirePermission("communications.edit");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong." };
  await staff.supabase.from("portal_announcements").delete().eq("id", id);
  revalidatePath("/portal", "layout");
  redirect("/admin/communications/announcements?deleted=1");
}

/** Emails a published announcement to everyone it's for (once). */
export async function emailAnnouncement(formData: FormData): Promise<Result> {
  const staff = await requirePermission("communications.edit");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong." };
  const { data: a } = await staff.supabase.from("portal_announcements").select("*").eq("id", id).maybeSingle();
  if (!a) return { error: "Announcement not found." };
  if (a.status !== "published") return { error: "Publish it first." };
  if (a.emailed_at) return { error: "This announcement has already been emailed." };
  const admin = createSecretClient();
  if (!admin) return { error: "Email isn't set up: the site's secret key is missing." };

  const [workers, families] = await Promise.all([
    a.audience !== "families" ? admin.from("user_roles").select("user_id").eq("role_key", "worker") : Promise.resolve({ data: [] as { user_id: string }[] }),
    a.audience !== "workers" ? admin.from("care_family_links").select("user_id").eq("is_active", true) : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);
  const ids = [...new Set([...(workers.data ?? []), ...(families.data ?? [])].map((r) => r.user_id))];
  const { data: active } = ids.length ? await admin.from("profiles").select("id").in("id", ids).eq("is_active", true) : { data: [] };
  const workerSet = new Set((workers.data ?? []).map((w) => w.user_id));
  const h = await headers();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`).replace(/\/$/, "");
  let sent = 0;
  for (const p of active ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(p.id);
    if (!u?.user?.email) continue;
    const res = await sendEmail({ to: [u.user.email], ...announcementEmail({ title: a.title, body: a.body, important: a.important, portal: workerSet.has(p.id) ? "/portal" : "/family" }, site) });
    if (res.reason === "not-configured") return { error: "Email isn't switched on yet. See Site settings → Email alerts." };
    if (res.sent) sent++;
  }
  await staff.supabase.from("portal_announcements").update({ emailed_at: new Date().toISOString(), emailed_count: sent }).eq("id", id);
  redirect(`/admin/communications/announcements/${id}?saved=emailed&n=${sent}`);
}
