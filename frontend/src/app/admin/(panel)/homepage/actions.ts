"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { UploadError, uploadImage } from "@/lib/admin/media";
import { BANNER_PAGES, SLIDE_COUNT } from "./config";
import type { Json as DbJson } from "@/lib/database.types";

type Result = { error: string } | undefined;
type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

const val = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
/** A media-library path (slider/2026/….mp4) or a built-in file under /videos/. */
const safeMediaPath = (p: string) => (/^(\/videos\/|[a-z0-9-]+\/\d{4}\/)[\w.-]+\.(mp4|webm)$/i.test(p) ? p : "");
const safeHref = (href: string) => (href.startsWith("/") || /^https?:\/\//.test(href) ? href : "");

export async function saveSlider(formData: FormData): Promise<Result> {
  const staff = await requirePermission("content.edit");
  const slides: Record<string, Json>[] = [];
  for (let i = 0; i < SLIDE_COUNT; i++) {
    if (formData.get(`slide_${i}_video__uploading`)) return { error: `Please wait for the video on slide ${i + 1} to finish uploading.` };
  }
  try {
    for (let i = 0; i < SLIDE_COUNT; i++) {
      const uploaded = await uploadImage(staff.supabase, formData.get(`slide_${i}_image`), "slider", staff.user.id, val(formData, `slide_${i}_heading`));
      const kept = formData.get(`slide_${i}_image__remove`) === "on" ? "" : val(formData, `slide_${i}_image_current`, 500);
      const buttons = [0, 1]
        .map((b) => ({ label: val(formData, `slide_${i}_button_${b}_label`, 40), href: safeHref(val(formData, `slide_${i}_button_${b}_href`, 300)) }))
        .filter((b) => b.label && b.href);
      const slide: Record<string, Json> = {
        image_path: uploaded ?? kept,
        video_path: safeMediaPath(val(formData, `slide_${i}_video`, 500)),
        image_alt: val(formData, `slide_${i}_image_alt`, 200),
        eyebrow: val(formData, `slide_${i}_eyebrow`, 80),
        heading: val(formData, `slide_${i}_heading`, 140),
        text: val(formData, `slide_${i}_text`, 300),
        buttons,
      };
      if (slide.heading || slide.image_path || slide.video_path) slides.push(slide);
    }
  } catch (e) {
    return { error: e instanceof UploadError ? e.message : "A photo could not be uploaded." };
  }
  if (!slides.length) return { error: "Add at least one slide with a heading." };

  const { data: home } = await staff.supabase.from("pages").select("id, body").eq("slug", "home").maybeSingle();
  const others = (Array.isArray(home?.body) ? (home.body as { type?: string }[]) : []).filter((b) => b?.type !== "hero");
  const body = [{ type: "hero", visible: true, data: { slides } }, ...others] as DbJson[];

  const { error } = home
    ? await staff.supabase.from("pages").update({ body, status: "published" }).eq("id", home.id)
    : await staff.supabase.from("pages").insert({ slug: "home", title: "Home", body, status: "published" });
  if (error) return { error: "The slider could not be saved. Please try again." };
  revalidatePath("/", "layout");
  redirect("/admin/homepage?saved=slider");
}

export async function saveBanners(formData: FormData): Promise<Result> {
  const staff = await requirePermission("content.edit");
  const { data: s } = await staff.supabase.from("site_settings").select("page_banners").maybeSingle();
  const banners = { ...((s?.page_banners as Record<string, string>) ?? {}) };
  try {
    for (const page of BANNER_PAGES) {
      const field = `banner_${page.key.replace(/\//g, "__")}`;
      const uploaded = await uploadImage(staff.supabase, formData.get(field), "banners", staff.user.id, page.label);
      if (uploaded) banners[page.key] = uploaded;
      else if (formData.get(`${field}__remove`) === "on") delete banners[page.key];
    }
  } catch (e) {
    return { error: e instanceof UploadError ? e.message : "A photo could not be uploaded." };
  }
  const { error } = await staff.supabase.rpc("set_page_banners", { banners });
  if (error) return { error: "The banners could not be saved. Please try again." };
  revalidatePath("/", "layout");
  redirect("/admin/homepage?saved=banners#banners");
}
