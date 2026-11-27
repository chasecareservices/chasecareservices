"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { sendInvitation } from "@/lib/email/send-invite";
import { ALL_CHECKS, LOCKED_STAGES, STAGES, CLOSED_STAGES, checkLabel } from "@/lib/recruitment";
import { createSecretClient } from "@/lib/supabase/server-auth";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const STAGE_KEYS = new Set<string>([...STAGES, ...CLOSED_STAGES].map((s) => s.key));
const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max) || null;
const list = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "");

/** Adds a website job application to the pipeline (stage: Registered). */
export async function addFromEnquiry(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.create");
  const enquiryId = String(formData.get("enquiry_id") ?? "");
  if (!UUID.test(enquiryId)) return { error: "Something went wrong. Please reload the page." };
  const { data: e } = await staff.supabase.from("enquiries").select("id, full_name, email, phone, message, payload").eq("id", enquiryId).maybeSingle();
  if (!e) return { error: "That application wasn't found." };
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const experience = [
    p.experience_years ? `Experience: ${p.experience_years}` : null,
    p.qualifications ? `Qualifications: ${p.qualifications}` : null,
    list(p.languages) ? `Languages: ${list(p.languages)}` : null,
    p.has_ghana_card ? `Ghana Card: ${p.has_ghana_card}` : null,
    p.start_date ? `Can start: ${p.start_date}` : null,
    e.message,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
  const { data: a, error } = await staff.supabase
    .from("recruitment_applicants")
    .insert({
      enquiry_id: e.id,
      full_name: e.full_name.slice(0, 120),
      email: e.email,
      phone: e.phone,
      role_applied: (typeof p.role === "string" ? p.role : null)?.slice(0, 80) ?? null,
      location: [p.location, p.travel_areas ? `can travel to ${p.travel_areas}` : null].filter(Boolean).join("; ").slice(0, 200) || null,
      availability: list(p.availability).slice(0, 200) || null,
      experience: experience || null,
      created_by: staff.user.id,
    })
    .select("id")
    .single();
  if (error || !a) return { error: error?.code === "23505" ? "This application is already in the pipeline." : "Couldn't add them to the pipeline. Please try again." };
  await staff.supabase.from("enquiries").update({ status: "converted" }).eq("id", e.id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/recruitment/${a.id}?saved=added`);
}

/** Adds someone who applied by phone or in person. */
export async function addApplicant(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.create");
  const fullName = text(formData, "full_name", 120);
  if (!fullName || fullName.length < 2) return { error: "Enter their full name." };
  const { data, error } = await staff.supabase
    .from("recruitment_applicants")
    .insert({
      full_name: fullName,
      email: text(formData, "email", 254)?.toLowerCase() ?? null,
      phone: text(formData, "phone", 40),
      role_applied: text(formData, "role_applied", 80),
      location: text(formData, "location", 200),
      created_by: staff.user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't add them. Please try again." };
  revalidatePath("/admin", "layout");
  redirect(`/admin/recruitment/${data.id}?saved=added`);
}

/** Moves an applicant to another stage. Approved/Placed need every check passed. */
export async function moveStage(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!UUID.test(id) || !STAGE_KEYS.has(stage)) return { error: "Something went wrong. Please reload the page." };
  if (LOCKED_STAGES.has(stage)) {
    const { data: missing } = await staff.supabase.rpc("recruitment_missing_checks", { applicant: id });
    if (missing?.length) {
      const order = ALL_CHECKS.map((c) => c.key).filter((k) => missing.includes(k));
      return { error: `Not yet: still to pass: ${order.map(checkLabel).join(", ")}.` };
    }
  }
  const { error } = await staff.supabase.from("recruitment_applicants").update({ stage }).eq("id", id);
  if (error) return { error: /placement without preparation/i.test(error.message) ? "Not yet: some checks haven't passed." : "Couldn't change the stage. Please try again." };
  revalidatePath("/admin", "layout");
  redirect(`/admin/recruitment/${id}?saved=stage`);
}

/** Saves the whole checklist at once. */
export async function saveChecks(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const { data: current } = await staff.supabase.from("recruitment_checks").select("check_key, status, note").eq("applicant_id", id);
  const before = new Map((current ?? []).map((c) => [c.check_key, c]));
  const rows = ALL_CHECKS.map((c) => {
    const status = String(formData.get(`status_${c.key}`) ?? "pending");
    const note = text(formData, `note_${c.key}`, 1000);
    return { applicant_id: id, check_key: c.key, status: ["pending", "passed", "failed", "not_needed"].includes(status) ? status : "pending", note };
  })
    .filter((r) => {
      const b = before.get(r.check_key);
      return b ? b.status !== r.status || (b.note ?? null) !== r.note : r.status !== "pending" || r.note;
    })
    .map((r) => ({ ...r, checked_by: staff.user.id, checked_at: new Date().toISOString() }));
  if (rows.some((r) => r.status === "not_needed" && !ALL_CHECKS.find((c) => c.key === r.check_key)?.optional)) {
    return { error: "Only the background check and safeguarding training can be marked “not needed”." };
  }
  if (rows.length) {
    const { error } = await staff.supabase.from("recruitment_checks").upsert(rows, { onConflict: "applicant_id,check_key" });
    if (error) return { error: "The checklist couldn't be saved. Please try again." };
  }
  revalidatePath(`/admin/recruitment/${id}`);
  redirect(`/admin/recruitment/${id}?saved=checks#checklist`);
}

export async function addNote(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const id = String(formData.get("id") ?? "");
  const body = text(formData, "body", 4000);
  if (!UUID.test(id) || !body) return { error: "Write a note first." };
  const { error } = await staff.supabase.from("recruitment_notes").insert({ applicant_id: id, body, author_id: staff.user.id });
  if (error) return { error: "The note couldn't be saved." };
  revalidatePath(`/admin/recruitment/${id}`);
  redirect(`/admin/recruitment/${id}?saved=note#notes`);
}

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** Approved applicant → care worker account (portal invitation). */
export async function inviteApplicant(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const id = String(formData.get("id") ?? "");
  const { data: a } = await staff.supabase.from("recruitment_applicants").select("id, full_name, email, phone, stage, worker_id").eq("id", id).maybeSingle();
  if (!a) return { error: "Applicant not found." };
  if (a.worker_id) return { error: "They already have a care worker account." };
  if (!LOCKED_STAGES.has(a.stage)) return { error: "Approve them first: every check must pass before they can work with clients." };
  if (!a.email) return { error: "Add their email address first (it's needed for the invitation)." };
  const admin = createSecretClient();
  if (!admin) return { error: "Invitations aren't set up yet: the site's secret key is missing." };
  const invite = await sendInvitation(admin, { email: a.email.toLowerCase(), fullName: a.full_name, kind: "worker", redirectTo: `${await siteOrigin()}/admin/set-password` });
  if ("error" in invite) {
    return {
      error:
        invite.error === "exists"
          ? "Someone with this email already has an account. Ask the Owner to add the Worker role in Staff & roles."
          : invite.error === "email-failed"
            ? "The invitation email couldn't be sent. Check Site settings → Email alerts → Send a test email."
            : "The invitation couldn't be sent. Please try again.",
    };
  }
  const [{ error: roleError }] = await Promise.all([
    admin.from("user_roles").insert({ user_id: invite.userId, role_key: "worker" }),
    a.phone ? admin.from("profiles").update({ phone: a.phone }).eq("id", invite.userId) : Promise.resolve({ error: null }),
  ]);
  if (roleError) return { error: "The invitation was sent, but the Worker role couldn't be added. Ask the Owner to add it in Staff & roles." };
  await staff.supabase.from("recruitment_applicants").update({ worker_id: invite.userId }).eq("id", a.id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/recruitment/${a.id}?saved=invited`);
}

/** Updates contact details. */
export async function saveApplicant(formData: FormData): Promise<Result> {
  const staff = await requirePermission("workforce.edit");
  const id = String(formData.get("id") ?? "");
  const fullName = text(formData, "full_name", 120);
  if (!UUID.test(id) || !fullName) return { error: "Enter their full name." };
  const { error } = await staff.supabase
    .from("recruitment_applicants")
    .update({
      full_name: fullName,
      email: text(formData, "email", 254)?.toLowerCase() ?? null,
      phone: text(formData, "phone", 40),
      role_applied: text(formData, "role_applied", 80),
      location: text(formData, "location", 200),
      availability: text(formData, "availability", 200),
      experience: text(formData, "experience", 4000),
    })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/admin/recruitment/${id}`);
  redirect(`/admin/recruitment/${id}?saved=details`);
}
