"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { UploadError, uploadImage, uploadedPaths } from "@/lib/admin/media";

type Result = { error: string } | undefined;

const FOLDER_RE = /^[a-z0-9-]{1,40}$/;

export async function uploadMedia(formData: FormData): Promise<Result> {
  const staff = await requirePermission("media.create");
  const alt = String(formData.get("alt_text") ?? "").trim().slice(0, 300);
  // Normal case: the browser already uploaded the photos and sends their paths.
  const uploaded = uploadedPaths(formData, "files");
  if (uploaded.length) {
    if (alt) await staff.supabase.from("media_assets").update({ alt_text: alt }).in("object_path", uploaded).is("alt_text", null);
    revalidatePath("/admin/media");
    redirect(`/admin/media?saved=${uploaded.length}`);
  }
  // Without JavaScript: the files come with the form.
  const files = formData.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (!files.length) return { error: "Choose at least one photo to upload." };
  if (files.length > 10) return { error: "Upload up to 10 photos at a time." };
  const folderRaw = String(formData.get("folder") ?? "library").trim().toLowerCase();
  const folder = FOLDER_RE.test(folderRaw) ? folderRaw : "library";
  try {
    for (const file of files) await uploadImage(staff.supabase, file, folder, staff.user.id, alt);
  } catch (e) {
    return { error: e instanceof UploadError ? e.message : "A photo could not be uploaded." };
  }
  revalidatePath("/admin/media");
  redirect(`/admin/media?saved=${files.length}`);
}

export async function updateAltText(formData: FormData): Promise<Result> {
  const staff = await requirePermission("media.edit");
  const id = String(formData.get("id") ?? "");
  const alt = String(formData.get("alt_text") ?? "").trim().slice(0, 300);
  const { error } = await staff.supabase.from("media_assets").update({ alt_text: alt || null }).eq("id", id);
  if (error) return { error: "The description could not be saved." };
  revalidatePath("/admin/media");
  redirect("/admin/media?saved=alt");
}

export async function deleteMedia(formData: FormData): Promise<Result> {
  const staff = await requirePermission("media.delete");
  const id = String(formData.get("id") ?? "");
  const { data: asset } = await staff.supabase.from("media_assets").select("bucket_id, object_path").eq("id", id).maybeSingle();
  if (!asset) return { error: "That photo no longer exists." };
  const { error: storageError } = await staff.supabase.storage.from(asset.bucket_id).remove([asset.object_path]);
  if (storageError) return { error: "The photo could not be deleted. Please try again." };
  const { error } = await staff.supabase.from("media_assets").delete().eq("id", id);
  if (error) return { error: "The photo was removed but its record could not be. Please try again." };
  revalidatePath("/", "layout");
  redirect("/admin/media?saved=deleted");
}
