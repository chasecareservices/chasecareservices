"use client";

import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";

/**
 * Photos go straight from the browser to storage (public-media bucket), so large
 * phone photos never pass through the website's server, which on Vercel accepts
 * only about 4.5 MB per request. The server action then receives just the path.
 */

export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
/** Largest photo we accept from the phone or computer, before shrinking. */
export const MAX_ORIGINAL_BYTES = 40 * 1024 * 1024;
/** Largest file we store (the bucket's own limit is higher). */
export const MAX_STORED_BYTES = 10 * 1024 * 1024;
/** Longest side after shrinking: sharp on large screens, small enough to load fast. */
export const MAX_DIMENSION = 2560;

export class BrowserUploadError extends Error {}

/** Shrinks big JPEG/WebP photos (and huge PNGs) to at most MAX_DIMENSION px, as JPEG. GIFs and small files are left alone. */
export async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  const isPng = file.type === "image/png";
  if (isPng && file.size <= MAX_STORED_BYTES) return file; // keep transparency (logos)
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // the browser can't read it; let the size check decide
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 2 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff"; // a transparent PNG becomes JPEG on white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Checks, shrinks and uploads one photo; records it in the media library. Returns the stored path. */
export async function uploadPhotoFromBrowser(original: File, folder: string): Promise<string> {
  if (!IMAGE_TYPES[original.type]) throw new BrowserUploadError(`“${original.name}” isn't a photo we can use. Use JPEG, PNG, WebP or GIF.`);
  if (original.size > MAX_ORIGINAL_BYTES) throw new BrowserUploadError(`“${original.name}” is too large (over 40 MB).`);
  const file = await shrinkImage(original);
  if (file.size > MAX_STORED_BYTES) throw new BrowserUploadError(`“${original.name}” is still over 10 MB after shrinking. Please use a smaller photo.`);

  const supabase = createAuthBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  const safeFolder = /^[a-z0-9-]{1,40}$/.test(folder) ? folder : "library";
  const path = `${safeFolder}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw new BrowserUploadError(
      /row-level security|unauthori|403/i.test(error.message)
        ? "You don't have permission to upload photos."
        : `“${original.name}” could not be uploaded. Check your connection and try again.`,
    );
  }
  await supabase.from("media_assets").insert({
    bucket_id: "public-media",
    object_path: path,
    folder: safeFolder,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: auth.user?.id ?? null,
  });
  return path;
}

/**
 * Before a form is sent: uploads the photos chosen in its file inputs and swaps each
 * file for `<name>__uploaded` = its stored path. Inputs marked data-direct="off"
 * (e.g. the video field, which uploads itself) are skipped.
 */
export async function uploadFormPhotos(form: HTMLFormElement, data: FormData, onProgress?: (done: number, total: number) => void) {
  const inputs = [...form.querySelectorAll<HTMLInputElement>('input[type="file"][name]')].filter(
    (i) => i.dataset.direct !== "off" && i.files && i.files.length > 0,
  );
  for (const i of inputs) {
    const max = Number(i.dataset.maxFiles);
    if (max && (i.files?.length ?? 0) > max) throw new BrowserUploadError(`Choose up to ${max} photos at a time.`);
  }
  const total = inputs.reduce((n, i) => n + (i.files?.length ?? 0), 0);
  let done = 0;
  if (total) onProgress?.(0, total);
  for (const input of inputs) {
    const folderField = input.dataset.folderField ? form.querySelector<HTMLInputElement>(`[name="${input.dataset.folderField}"]`)?.value.trim().toLowerCase() : undefined;
    const folder = folderField || input.dataset.folder || "library";
    data.delete(input.name);
    for (const file of Array.from(input.files ?? [])) {
      const path = await uploadPhotoFromBrowser(file, folder);
      data.append(`${input.name}__uploaded`, path);
      onProgress?.(++done, total);
    }
  }
  return total;
}
