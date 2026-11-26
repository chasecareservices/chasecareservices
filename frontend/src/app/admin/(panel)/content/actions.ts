"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { UploadError, uploadImage } from "@/lib/admin/media";
import { getResource } from "@/lib/admin/resources";
import { friendlyDbError, readFields } from "@/lib/admin/values";

export type SaveResult = { error: string } | undefined;

const UUID = /^[0-9a-f-]{36}$/;

export async function saveResource(formData: FormData): Promise<SaveResult> {
  const resource = getResource(String(formData.get("__resource") ?? ""));
  if (!resource) return { error: "Unknown content type." };
  const id = String(formData.get("__id") ?? "");
  if (id && !UUID.test(id)) return { error: "Unknown item." };
  const staff = await requirePermission(`${resource.section}.${id ? "edit" : "create"}`);

  const { values, error } = readFields(resource, formData);
  if (error) return { error };

  try {
    for (const f of resource.fields.filter((f) => f.type === "image" || f.type === "image-array")) {
      const path = await uploadImage(staff.supabase, formData.get(f.name), resource.key, staff.user.id, String(values[resource.titleField] ?? ""));
      if (path) values[f.name] = f.type === "image-array" ? [path] : path;
      else if (formData.get(`${f.name}__remove`) === "on") values[f.name] = f.type === "image-array" ? [] : null;
    }
  } catch (e) {
    return { error: e instanceof UploadError ? e.message : "The photo could not be uploaded." };
  }

  // Testimonials: record when consent was confirmed (needed before publishing).
  if (resource.key === "testimonials") {
    const { data: existing } = id
      ? await staff.supabase.from("testimonials").select("consent_recorded_at").eq("id", id).maybeSingle()
      : { data: null };
    values.consent_recorded_at = values.consent_obtained ? existing?.consent_recorded_at ?? new Date().toISOString() : null;
  }
  if (resource.key === "announcements" && !values.starts_at) values.starts_at = new Date().toISOString();

  const table = staff.supabase.from(resource.table as "services");
  const result = id
    ? await table.update(values as never).eq("id", id).select("id").maybeSingle()
    : await table.insert(values as never).select("id").single();
  const message = friendlyDbError(result.error);
  if (message) return { error: message };
  if (!result.data) return { error: "You don't have permission to make that change." };

  revalidatePath("/", "layout");
  redirect(`/admin/content/${resource.key}/${result.data.id}?saved=1`);
}

export async function deleteResource(formData: FormData): Promise<SaveResult> {
  const resource = getResource(String(formData.get("__resource") ?? ""));
  const id = String(formData.get("__id") ?? "");
  if (!resource || !UUID.test(id)) return { error: "Unknown item." };
  const staff = await requirePermission(`${resource.section}.delete`);
  const { error, count } = await staff.supabase.from(resource.table as "services").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { error: friendlyDbError(error) ?? "You don't have permission to delete this." };
  revalidatePath("/", "layout");
  redirect(`/admin/content/${resource.key}?deleted=1`);
}
