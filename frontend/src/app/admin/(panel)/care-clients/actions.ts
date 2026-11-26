"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { createSecretClient } from "@/lib/supabase/server-auth";
import { parseLatLng } from "@/lib/care";
import { sendInvitation } from "@/lib/email/send-invite";
import { cleanDigitalAddress } from "@/lib/ghana-address";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/**
 * Google Maps "Share" links (maps.app.goo.gl/…) hide the coordinates. Follow the
 * redirects (Google hosts only, up to 4 hops, 5 seconds) to find them.
 */
async function resolveShortMapsLink(text: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return text;
  }
  const google = (h: string) => /(^|\.)(goo\.gl|google\.com|google\.com\.gh|app\.goo\.gl)$/.test(h);
  if (!/^(maps\.app\.goo\.gl|goo\.gl)$/.test(url.hostname)) return text;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
      const next = res.headers.get("location");
      if (!next) break;
      url = new URL(next, url);
      if (!google(url.hostname)) break;
      if (parseLatLng(url.toString())) return url.toString();
    }
  } catch {
    /* offline or blocked: fall through to the friendly error */
  }
  return url.toString();
}

export async function saveClient(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") ?? "");
  const staff = await requirePermission(id ? "clients.edit" : "clients.create");
  const fullName = text(formData, "full_name", 120);
  if (!fullName || fullName.length < 2) return { error: "Enter the client's full name." };
  const homeText = await resolveShortMapsLink(String(formData.get("home_location") ?? "").trim().slice(0, 2000));
  const home = homeText ? parseLatLng(homeText) : null;
  if (homeText && !home)
    return {
      error:
        "We couldn't read that home location. Paste the link from Google Maps (Share → Copy link), or coordinates like 5.6037, -0.1870 (in Google Maps, press and hold on the home to see them).",
    };
  const digital = cleanDigitalAddress(String(formData.get("digital_address") ?? ""));
  if (digital === undefined) return { error: "The Ghana Post digital address should look like GA-183-8164." };
  const row = {
    full_name: fullName,
    address: text(formData, "address", 300),
    digital_address: digital,
    home_lat: home?.lat ?? null,
    home_lng: home?.lng ?? null,
    preferred_name: text(formData, "preferred_name", 60),
    area: text(formData, "area", 120),
    care_summary: text(formData, "care_summary", 2000),
    emergency_contact_name: text(formData, "emergency_contact_name", 120),
    emergency_contact_phone: text(formData, "emergency_contact_phone", 40),
    is_active: id ? formData.get("is_active") === "on" : true,
    updated_by: staff.user.id,
  };
  const { data, error } = id
    ? await staff.supabase.from("care_clients").update(row).eq("id", id).select("id").single()
    : await staff.supabase.from("care_clients").insert(row).select("id").single();
  if (error || !data) return { error: "The client could not be saved. Please try again." };
  revalidatePath("/admin/care-clients");
  redirect(`/admin/care-clients/${data.id}?saved=client`);
}

/** Who visits this client: ticked workers are assigned, unticked ones are removed (kept for history). */
export async function saveAssignments(formData: FormData): Promise<Result> {
  const staff = await requirePermission("clients.edit");
  const clientId = String(formData.get("client_id") ?? "");
  if (!UUID.test(clientId)) return { error: "Something went wrong. Please reload the page." };
  const chosen = new Set(formData.getAll("worker_id").map(String).filter((v) => UUID.test(v)));
  const { data: current } = await staff.supabase.from("care_assignments").select("worker_id, is_active").eq("client_id", clientId);
  for (const a of current ?? []) {
    const want = chosen.has(a.worker_id);
    if (want !== a.is_active) {
      const { error } = await staff.supabase.from("care_assignments").update({ is_active: want }).eq("client_id", clientId).eq("worker_id", a.worker_id);
      if (error) return { error: "The care team could not be saved. Please try again." };
    }
    chosen.delete(a.worker_id);
  }
  if (chosen.size) {
    const { error } = await staff.supabase.from("care_assignments").insert([...chosen].map((worker_id) => ({ client_id: clientId, worker_id })));
    if (error) return { error: "The care team could not be saved. Please try again." };
  }
  revalidatePath("/admin/care-clients");
  redirect(`/admin/care-clients/${clientId}?saved=team`);
}

/**
 * Invites a care worker by email. They choose a password from the email link and are
 * then taken to the care worker portal. Needs workforce.create (Operations Manager, Owner).
 */
export async function inviteWorker(formData: FormData): Promise<Result> {
  await requirePermission("workforce.create");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = text(formData, "full_name", 120);
  const phone = text(formData, "phone", 40);
  if (!fullName) return { error: "Enter the care worker's full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address, like ama@example.com." };

  const admin = createSecretClient();
  if (!admin) return { error: "Invitations aren't set up yet: the site's secret key is missing. Ask your developer." };

  const invite = await sendInvitation(admin, { email, fullName, kind: "worker", redirectTo: `${await siteOrigin()}/admin/set-password` });
  if ("error" in invite) {
    return {
      error:
        invite.error === "exists"
          ? "Someone with this email already has an account. Ask the Owner to add the Worker role to them in Staff & roles."
          : invite.error === "email-failed"
            ? "The invitation email could not be sent. Check the email settings (Site settings → Email alerts → Send a test email), then try again."
            : "The invitation could not be sent. Please check the email address and try again.",
    };
  }
  const data = { user: { id: invite.userId } };
  // The permission was checked above; the secret key is needed because care managers
  // don't manage staff roles generally.
  const [{ error: roleError }] = await Promise.all([
    admin.from("user_roles").insert({ user_id: data.user.id, role_key: "worker" }),
    phone ? admin.from("profiles").update({ phone }).eq("id", data.user.id) : Promise.resolve({ error: null }),
  ]);
  if (roleError) return { error: "The invitation was sent, but the Worker role could not be added. Ask the Owner to add it in Staff & roles." };
  revalidatePath("/admin/care-clients");
  redirect(`/admin/care-clients?saved=invited&who=${encodeURIComponent(email)}#care-workers`);
}

/** "one per line" text → a clean list (blank lines dropped, each trimmed). */
function lines(f: FormData, k: string, maxItems: number) {
  return String(f.get(k) ?? "")
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function saveCarePlan(formData: FormData): Promise<Result> {
  const staff = await requirePermission("clients.edit");
  const clientId = String(formData.get("client_id") ?? "");
  if (!UUID.test(clientId)) return { error: "Something went wrong. Please reload the page." };
  const goals = lines(formData, "goals", 15);
  const tasks = lines(formData, "visit_tasks", 30);
  const tooLong = [...goals, ...tasks].find((t) => t.length > 200);
  if (tooLong) return { error: `Please shorten “${tooLong.slice(0, 40)}…” to 200 characters or fewer.` };
  const review = String(formData.get("review_date") ?? "");
  if (review && !/^\d{4}-\d{2}-\d{2}$/.test(review)) return { error: "Enter the review date as a date." };
  const { error } = await staff.supabase.from("care_plans").upsert({
    client_id: clientId,
    about_me: text(formData, "about_me", 2000),
    goals,
    visit_tasks: tasks,
    risks: text(formData, "risks", 2000),
    medication_notes: text(formData, "medication_notes", 2000),
    review_date: review || null,
    updated_by: staff.user.id,
  });
  if (error) return { error: "The care plan could not be saved. Please try again." };
  revalidatePath("/admin/care-clients");
  revalidatePath("/portal", "layout");
  redirect(`/admin/care-clients/${clientId}?saved=plan#care-plan`);
}

const RELATIONSHIPS = ["Daughter", "Son", "Wife", "Husband", "Mother", "Father", "Sister", "Brother", "Grandchild", "Guardian", "Friend", "Other"];

/**
 * Gives a family member access to this client's family portal. New people get an
 * invitation email to set a password; people who already have a family account
 * are simply linked.
 */
export async function inviteFamily(formData: FormData): Promise<Result> {
  const staff = await requirePermission("clients.edit");
  const clientId = String(formData.get("client_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = text(formData, "full_name", 120);
  const relationship = String(formData.get("relationship") ?? "");
  if (!UUID.test(clientId)) return { error: "Something went wrong. Please reload the page." };
  if (!fullName) return { error: "Enter the family member's full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address, like efua@example.com." };
  if (!RELATIONSHIPS.includes(relationship)) return { error: "Choose how they are related." };

  const admin = createSecretClient();
  if (!admin) return { error: "Invitations aren't set up yet: the site's secret key is missing. Ask your developer." };

  let userId: string | undefined;
  let invited = false;
  const { data: clientRow } = await staff.supabase.from("care_clients").select("full_name, preferred_name").eq("id", clientId).maybeSingle();
  const invite = await sendInvitation(admin, {
    email,
    fullName,
    kind: "family",
    clientName: clientRow ? clientRow.preferred_name || clientRow.full_name : null,
    redirectTo: `${await siteOrigin()}/admin/set-password`,
  });
  if ("userId" in invite) {
    userId = invite.userId;
    invited = true;
  } else if (invite.error === "email-failed") {
    return { error: "The invitation email could not be sent. Check the email settings (Site settings → Email alerts → Send a test email), then try again." };
  } else if (invite.error === "exists") {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (userId) {
      const { data: roles } = await admin.from("user_roles").select("role_key").eq("user_id", userId);
      if ((roles ?? []).some((r) => r.role_key !== "client")) {
        return { error: "This email belongs to a staff member or care worker. Family members need their own email address." };
      }
    }
  }
  if (!userId) return { error: "The invitation could not be sent. Please check the email address and try again." };

  const [{ error: roleError }, { error: linkError }] = await Promise.all([
    admin.from("user_roles").upsert({ user_id: userId, role_key: "client" }, { onConflict: "user_id,role_key", ignoreDuplicates: true }),
    staff.supabase
      .from("care_family_links")
      .upsert({ client_id: clientId, user_id: userId, relationship, is_active: true, created_by: staff.user.id }, { onConflict: "client_id,user_id" }),
  ]);
  if (roleError || linkError) return { error: "The family member could not be given access. Please try again." };
  revalidatePath(`/admin/care-clients/${clientId}`);
  redirect(`/admin/care-clients/${clientId}?saved=${invited ? "family-invited" : "family-linked"}#family`);
}

/** Switches a family member's access to this client on or off. */
export async function setFamilyAccess(formData: FormData): Promise<Result> {
  const staff = await requirePermission("clients.edit");
  const linkId = String(formData.get("link_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const active = formData.get("active") === "true";
  if (!UUID.test(linkId) || !UUID.test(clientId)) return { error: "Something went wrong. Please reload the page." };
  const { error } = await staff.supabase.from("care_family_links").update({ is_active: active }).eq("id", linkId).eq("client_id", clientId);
  if (error) return { error: "Access could not be changed. Please try again." };
  revalidatePath(`/admin/care-clients/${clientId}`);
  redirect(`/admin/care-clients/${clientId}?saved=${active ? "family-on" : "family-off"}#family`);
}
