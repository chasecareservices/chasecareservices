import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class UploadError extends Error {}

/**
 * Uploads a photo to the public-media bucket as the signed-in staff member
 * (storage rules check media.create) and records it in the media library.
 * Returns the stored path, or null when no file was chosen.
 */
export async function uploadImage(
  supabase: SupabaseClient<Database>,
  file: FormDataEntryValue | null,
  folder: string,
  userId: string,
  altText = "",
): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new UploadError("Photos must be JPEG, PNG, WebP or GIF files.");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Photos must be 10 MB or smaller.");

  const now = new Date();
  const path = `${folder}/${now.getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new UploadError(/row-level security|unauthori/i.test(error.message) ? "You don't have permission to upload photos." : "The photo could not be uploaded. Please try again.");

  await supabase.from("media_assets").insert({
    bucket_id: "public-media",
    object_path: path,
    folder,
    alt_text: altText.slice(0, 300) || null,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: userId,
  });
  return path;
}

/** A path written by the browser upload: `<folder>/<year>/<uuid>.<ext>` in public-media. */
export const UPLOADED_PATH = /^[a-z0-9-]{1,40}\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

/** The paths the browser uploaded for this file field (see browser-upload.ts), checked. */
export function uploadedPaths(formData: FormData, name: string): string[] {
  return formData
    .getAll(`${name}__uploaded`)
    .map(String)
    .filter((p) => UPLOADED_PATH.test(p));
}

/**
 * The photo for a form field: the one the browser already uploaded (normal case),
 * or, if the page ran without JavaScript, the file sent with the form.
 * Gives the media-library entry a description when it has none yet.
 */
export async function photoFromForm(
  supabase: SupabaseClient<Database>,
  formData: FormData,
  name: string,
  folder: string,
  userId: string,
  altText = "",
): Promise<string | null> {
  const [path] = uploadedPaths(formData, name);
  if (path) {
    if (altText) await supabase.from("media_assets").update({ alt_text: altText.slice(0, 300) }).eq("object_path", path).is("alt_text", null);
    return path;
  }
  return uploadImage(supabase, formData.get(name), folder, userId, altText);
}
