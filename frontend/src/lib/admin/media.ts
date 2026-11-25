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
