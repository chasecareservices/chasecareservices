"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireStaff } from "@/lib/admin/session";
import { parseLatLng } from "@/lib/care";
import { resolveShortMapsLink } from "@/lib/maps-link";
import { LANGUAGES, SKILLS, TIME_OFF_KINDS, availabilityFromForm } from "@/lib/matching";

type Result = { error: string } | undefined;
const UUID = /^[0-9a-f-]{36}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const back = (id: string, saved: string, hash: string) => redirect(`/admin/care-workers/${id}?saved=${saved}${hash}`);

/** Skills, languages, gender, where they live, how far they travel, maximum hours. */
export async function saveWorkerProfile(formData: FormData): Promise<Result> {
  const staff = await requireStaff();
  if (!staff.can("care_ops.edit") && !staff.can("workforce.edit")) return { error: "You don't have permission to change this." };
  const id = String(formData.get("worker_id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const skills = formData.getAll("skills").map(String).filter((s) => SKILLS.some((k) => k.value === s));
  const languages = formData.getAll("languages").map(String).filter((l) => LANGUAGES.includes(l));
  const gender = String(formData.get("gender") ?? "");
  const travel = Number(formData.get("travel_km") ?? 15);
  const maxRaw = String(formData.get("max_hours_week") ?? "").trim();
  const max = maxRaw ? Number(maxRaw) : null;
  if (!Number.isInteger(travel) || travel < 1 || travel > 500) return { error: "Travel distance must be between 1 and 500 km." };
  if (max !== null && (!Number.isInteger(max) || max < 1 || max > 84)) return { error: "Maximum hours must be between 1 and 84 a week." };
  const homeText = await resolveShortMapsLink(String(formData.get("home_location") ?? "").trim().slice(0, 2000));
  const home = homeText ? parseLatLng(homeText) : null;
  if (homeText && !home) return { error: "We couldn't read that location. Paste a Google Maps link (Share → Copy link), or coordinates like 5.6037, -0.1870." };
  const { error } = await staff.supabase.from("worker_profiles").upsert({
    worker_id: id,
    skills,
    languages,
    gender: gender === "female" || gender === "male" ? gender : null,
    home_area: String(formData.get("home_area") ?? "").trim().slice(0, 200) || null,
    home_lat: home?.lat ?? null,
    home_lng: home?.lng ?? null,
    travel_km: travel,
    max_hours_week: max,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 500) || null,
    updated_by: staff.user.id,
  });
  if (error) return { error: "The profile couldn't be saved. Please try again." };
  revalidatePath(`/admin/care-workers/${id}`);
  back(id, "profile", "#matching");
}

export async function saveWorkerAvailability(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const id = String(formData.get("worker_id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const parsed = availabilityFromForm((k) => (formData.get(k) as string | null) ?? null);
  if ("error" in parsed) return parsed;
  const { error: delError } = await staff.supabase.from("worker_availability").delete().eq("worker_id", id);
  if (delError) return { error: "Availability couldn't be saved. Please try again." };
  if (parsed.rows.length) {
    const { error } = await staff.supabase.from("worker_availability").insert(parsed.rows.map((r) => ({ ...r, worker_id: id })));
    if (error) return { error: "Availability couldn't be saved. Please try again." };
  }
  back(id, "availability", "#availability");
}

export async function addWorkerTimeOff(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const id = String(formData.get("worker_id") ?? "");
  const from = String(formData.get("starts_on") ?? "");
  const to = String(formData.get("ends_on") ?? "") || from;
  const kind = String(formData.get("kind") ?? "leave");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  if (!DATE.test(from) || !DATE.test(to) || to < from) return { error: "Choose the first and last day (the last day can't be before the first)." };
  if (!TIME_OFF_KINDS.some((k) => k.value === kind)) return { error: "Choose a reason." };
  const { error } = await staff.supabase
    .from("worker_time_off")
    .insert({ worker_id: id, starts_on: from, ends_on: to, kind, note: String(formData.get("note") ?? "").trim().slice(0, 200) || null, created_by: staff.user.id });
  if (error) return { error: "That couldn't be saved. Please try again." };
  back(id, "timeoff", "#availability");
}

export async function removeWorkerTimeOff(formData: FormData): Promise<Result> {
  const staff = await requirePermission("care_ops.edit");
  const id = String(formData.get("worker_id") ?? "");
  const off = String(formData.get("id") ?? "");
  if (!UUID.test(id) || !UUID.test(off)) return { error: "Something went wrong. Please reload the page." };
  const { error } = await staff.supabase.from("worker_time_off").delete().eq("id", off).eq("worker_id", id);
  if (error) return { error: "That couldn't be removed." };
  back(id, "timeoff-removed", "#availability");
}

/** A client's needs for matching: skills, preferred carer gender, languages. */
export async function saveClientNeeds(formData: FormData): Promise<Result> {
  const staff = await requirePermission("clients.edit");
  const id = String(formData.get("client_id") ?? "");
  if (!UUID.test(id)) return { error: "Something went wrong. Please reload the page." };
  const gender = String(formData.get("preferred_gender") ?? "");
  const { error } = await staff.supabase
    .from("care_clients")
    .update({
      required_skills: formData.getAll("required_skills").map(String).filter((s) => SKILLS.some((k) => k.value === s)),
      languages: formData.getAll("languages").map(String).filter((l) => LANGUAGES.includes(l)),
      preferred_gender: gender === "female" || gender === "male" ? gender : null,
      updated_by: staff.user.id,
    })
    .eq("id", id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/admin/care-clients/${id}`);
  redirect(`/admin/care-clients/${id}?saved=needs#needs`);
}
