/* eslint-disable @next/next/no-img-element -- previews of uploaded photos */
import Link from "next/link";
import { saveBanners, saveSlider } from "./actions";
import { BANNER_PAGES, SLIDE_COUNT } from "./config";
import { ActionForm } from "@/components/admin/ActionForm";
import { VideoUploadField } from "@/components/admin/VideoUploadField";
import { Card, Notice, PageHeader, adminInput } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { mediaUrl } from "@/lib/content";
import { HERO_SLIDES } from "@/lib/images";

export const metadata = { title: "Homepage & banners" };

type Slide = { image_path?: string; video_path?: string; image_alt?: string; eyebrow?: string; heading?: string; text?: string; buttons?: { label: string; href: string }[] };

function Preview({ path }: { path?: string | null }) {
  const src = mediaUrl(path);
  return src ? (
    <img src={src} alt="" className="h-28 w-48 rounded-lg object-cover ring-1 ring-gray-200" />
  ) : (
    <div className="flex h-28 w-48 items-center justify-center rounded-lg bg-brand-100 text-xs font-semibold text-brand-700">Purple placeholder</div>
  );
}

export default async function HomepagePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const staff = await requirePermission("content.edit");
  const [{ data: home }, { data: settings }] = await Promise.all([
    staff.supabase.from("pages").select("body, status").eq("slug", "home").maybeSingle(),
    staff.supabase.from("site_settings").select("page_banners").maybeSingle(),
  ]);
  const hero = (Array.isArray(home?.body) ? (home.body as { type?: string; data?: { slides?: Slide[] } }[]) : []).find((b) => b?.type === "hero");
  const saved_slides = home?.status === "published" ? hero?.data?.slides ?? [] : [];
  // Until the owner saves their own slides, start from the built-in ones.
  const slides: Slide[] = Array.from({ length: SLIDE_COUNT }, (_, i) =>
    saved_slides.length
      ? saved_slides[i] ?? {}
      : HERO_SLIDES[i]
        ? {
            image_path: HERO_SLIDES[i].image.src ?? undefined,
            video_path: HERO_SLIDES[i].video?.src,
            image_alt: HERO_SLIDES[i].image.alt ?? undefined,
            eyebrow: HERO_SLIDES[i].eyebrow,
            heading: HERO_SLIDES[i].heading,
            text: HERO_SLIDES[i].text,
            buttons: HERO_SLIDES[i].buttons,
          }
        : {},
  );
  const banners = (settings?.page_banners ?? {}) as Record<string, string>;

  return (
    <>
      {saved === "slider" && <Notice>Slider saved. The homepage has been updated.</Notice>}
      {saved === "banners" && <Notice>Banners saved. The pages have been updated.</Notice>}
      <PageHeader title="Homepage & banners" intro="The slider at the top of the homepage (photos and videos, up to 6 slides), and background photos for each page's banner." />

      <ActionForm action={saveSlider} submitLabel="Save slider">
        <div className="space-y-6">
          {slides.map((s, i) => (
            <Card key={i} title={`Slide ${i + 1}`}>
              <div className="grid gap-5 lg:grid-cols-[12rem_1fr]">
                <div className="space-y-2">
                  <Preview path={s.image_path} />
                  <input type="hidden" name={`slide_${i}_image_current`} value={s.image_path ?? ""} />
                  <input name={`slide_${i}_image`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label={`Photo for slide ${i + 1}`} className="block w-full text-xs" />
                  {s.image_path && (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name={`slide_${i}_image__remove`} className="accent-brand-800" /> Remove photo
                    </label>
                  )}
                  <p className="text-xs text-muted">Landscape, at least 1920 × 1080 px. Keep faces away from the left edge.</p>
                  <VideoUploadField
                    name={`slide_${i}_video`}
                    current={s.video_path ?? ""}
                    label="Video (optional): MP4 or WebM, up to 50 MB, plays silently on a loop. The photo shows while it loads."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-brand-900">
                    Small heading
                    <input name={`slide_${i}_eyebrow`} defaultValue={s.eyebrow ?? ""} maxLength={80} className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    Photo description (for screen readers)
                    <input name={`slide_${i}_image_alt`} defaultValue={s.image_alt ?? ""} maxLength={200} className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900 md:col-span-2">
                    Main heading
                    <input name={`slide_${i}_heading`} defaultValue={s.heading ?? ""} maxLength={140} className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900 md:col-span-2">
                    Text
                    <textarea name={`slide_${i}_text`} defaultValue={s.text ?? ""} rows={2} maxLength={300} className={adminInput} />
                  </label>
                  {[0, 1].map((b) => (
                    <div key={b} className="grid grid-cols-2 gap-2">
                      <label className="text-sm font-medium text-brand-900">
                        Button {b + 1} text
                        <input name={`slide_${i}_button_${b}_label`} defaultValue={s.buttons?.[b]?.label ?? ""} maxLength={40} className={adminInput} />
                      </label>
                      <label className="text-sm font-medium text-brand-900">
                        Goes to
                        <input name={`slide_${i}_button_${b}_href`} defaultValue={s.buttons?.[b]?.href ?? ""} placeholder="/care-services" maxLength={300} className={adminInput} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          <p className="text-sm text-muted">Leave a slide&apos;s heading and photo empty to remove it from the slider.</p>
        </div>
      </ActionForm>

      <div id="banners" className="mt-12 scroll-mt-24">
        <PageHeader title="Page banners" intro="A background photo for the banner at the top of each page. Pages without one use the purple banner." />
        <ActionForm action={saveBanners} submitLabel="Save banners">
          <Card>
            <ul className="divide-y divide-gray-100">
              {BANNER_PAGES.map((p) => {
                const field = `banner_${p.key.replace(/\//g, "__")}`;
                return (
                  <li key={p.key} className="grid gap-3 py-4 sm:grid-cols-[12rem_1fr] sm:items-center">
                    <Preview path={banners[p.key]} />
                    <div className="space-y-2">
                      <p className="font-semibold text-brand-900">
                        {p.label}{" "}
                        <Link href={p.href} target="_blank" className="text-xs font-normal text-brand-700 underline">
                          view page ↗
                        </Link>
                      </p>
                      <input name={field} type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label={`Banner photo for ${p.label}`} className="block text-sm" />
                      {banners[p.key] && (
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name={`${field}__remove`} className="accent-brand-800" /> Remove photo
                        </label>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </ActionForm>
      </div>
    </>
  );
}
