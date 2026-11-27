"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { toIso } from "@/lib/admin/values";
import { sendEventReminders } from "@/lib/email/events-send";
import { EVENT_KINDS, REGISTRATION_STATUS, eventSlug } from "@/lib/events";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;

function readEvent(f: FormData): { value: Record<string, unknown> } | { error: string } {
  const title = text(f, "title", 200);
  const kind = String(f.get("kind") ?? "");
  const starts = toIso(String(f.get("starts_at") ?? ""));
  const endsRaw = String(f.get("ends_at") ?? "");
  const ends = endsRaw ? toIso(endsRaw) : null;
  const status = String(f.get("status") ?? "draft");
  const capRaw = String(f.get("capacity") ?? "").trim();
  if (!title || title.length < 2) return { error: "Give the event a title." };
  if (!EVENT_KINDS.some((k) => k.value === kind)) return { error: "Choose the type of event." };
  if (!starts) return { error: "Choose the date and start time." };
  if (endsRaw && (!ends || Date.parse(ends) <= Date.parse(starts))) return { error: "The end time must be after the start time." };
  if (!["draft", "published", "cancelled", "archived"].includes(status)) return { error: "Choose a status." };
  if (capRaw && !(Number.isInteger(Number(capRaw)) && Number(capRaw) > 0)) return { error: "Places must be a whole number, or empty for no limit." };
  return {
    value: {
      title,
      kind,
      starts_at: starts,
      ends_at: ends,
      status,
      topic: text(f, "topic", 120),
      summary: text(f, "summary", 400),
      description: text(f, "description", 5000),
      speaker: text(f, "speaker", 300),
      venue: text(f, "venue", 300),
      online: f.get("online") === "on",
      capacity: capRaw ? Number(capRaw) : null,
      registration_open: f.get("registration_open") === "on",
    },
  };
}

async function saveLink(staff: Awaited<ReturnType<typeof requirePermission>>, id: string, f: FormData): Promise<string | null> {
  const url = String(f.get("online_url") ?? "").trim();
  if (!url) {
    await staff.supabase.from("community_event_links").delete().eq("event_id", id);
    return null;
  }
  if (!/^https:\/\/\S+$/i.test(url) || url.length > 500) return "The online link must start with https://";
  const { error } = await staff.supabase.from("community_event_links").upsert({ event_id: id, online_url: url, updated_at: new Date().toISOString() });
  return error ? "The online link couldn't be saved." : null;
}

export async function createEvent(formData: FormData): Promise<Result> {
  const staff = await requirePermission("community.create");
  const read = readEvent(formData);
  if ("error" in read) return read;
  const { data, error } = await staff.supabase
    .from("community_events")
    .insert({ ...(read.value as { title: string; starts_at: string }), slug: eventSlug(String(read.value.title), String(read.value.starts_at)) })
    .select("id")
    .single();
  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? read.value.kind === "forum"
            ? "There's already a forum on that day."
            : "There's already an event with this title on that day."
          : "The event couldn't be saved. Please try again.",
    };
  }
  const linkError = await saveLink(staff, data.id, formData);
  revalidatePath("/", "layout");
  redirect(`/admin/events/${data.id}?saved=${linkError ? "nolink" : "created"}`);
}

export async function updateEvent(formData: FormData): Promise<Result> {
  const staff = await requirePermission("community.edit");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const read = readEvent(formData);
  if ("error" in read) return read;
  const { error } = await staff.supabase.from("community_events").update(read.value).eq("id", id);
  if (error) return { error: error.code === "23505" ? "There's already a forum on that day." : "The event couldn't be saved. Please try again." };
  const linkError = await saveLink(staff, id, formData);
  if (linkError) return { error: linkError };
  revalidatePath("/", "layout");
  redirect(`/admin/events/${id}?saved=event`);
}

/** Attendance and status for every registration in one go. */
export async function saveAttendance(formData: FormData): Promise<Result> {
  const staff = await requirePermission("community.edit");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const changes = [...formData.entries()]
    .filter(([k]) => k.startsWith("status_"))
    .map(([k, v]) => ({ rid: k.slice(7), status: String(v) }))
    .filter((c) => UUID.test(c.rid) && REGISTRATION_STATUS.some((s) => s.value === c.status));
  const { data: current } = await staff.supabase.from("event_registrations").select("id, status").eq("event_id", id);
  const changed = changes.filter((c) => current?.find((r) => r.id === c.rid && r.status !== c.status));
  for (const c of changed) {
    const { error } = await staff.supabase.from("event_registrations").update({ status: c.status }).eq("id", c.rid).eq("event_id", id);
    if (error) return { error: "Attendance couldn't be saved. Please try again." };
  }
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${id}?saved=attendance#registrations`);
}

/** Someone who registered by phone or at the door. */
export async function addRegistration(formData: FormData): Promise<Result> {
  const staff = await requirePermission("community.create");
  const id = String(formData.get("id") ?? "");
  const fullName = text(formData, "full_name", 120);
  const email = text(formData, "email", 254)?.toLowerCase() ?? null;
  const phone = text(formData, "phone", 40);
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  if (!fullName || fullName.length < 2) return { error: "Enter their name." };
  if (!email && !phone) return { error: "Enter an email address or phone number." };
  const { error } = await staff.supabase.from("event_registrations").insert({
    event_id: id,
    full_name: fullName,
    email,
    phone,
    attend_mode: formData.get("attend_mode") === "online" ? "online" : "in_person",
    status: formData.get("attended") === "on" ? "attended" : "registered",
    source: "staff",
  });
  if (error) return { error: error.code === "23505" ? "They're already registered." : error.code === "23514" ? "Check the email address." : "Couldn't add them. Please try again." };
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${id}?saved=added#registrations`);
}

export async function remindAttendees(formData: FormData): Promise<Result> {
  await requirePermission("community.edit");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const r = await sendEventReminders(id);
  if (r.notConfigured) return { error: "Email isn't switched on yet, so reminders can't be sent. See Site settings → Email alerts." };
  if (!r.sent && r.failed) return { error: "The reminders couldn't be sent. Check Site settings → Email alerts → Send a test email." };
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${id}?saved=reminded&sent=${r.sent}&nomail=${r.noEmail}#registrations`);
}
