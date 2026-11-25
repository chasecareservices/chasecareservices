/* eslint-disable @next/next/no-img-element -- thumbnails of uploaded photos */
import Link from "next/link";
import { deleteMedia, updateAltText, uploadMedia } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { mediaUrl } from "@/lib/content";

export const metadata = { title: "Media library" };

const PAGE_SIZE = 24;

function size(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ saved?: string; folder?: string; page?: string }> }) {
  const { saved, folder, page } = await searchParams;
  const staff = await requirePermission("media.view");
  const current = Math.max(1, Number(page) || 1);

  let query = staff.supabase
    .from("media_assets")
    .select("id, object_path, folder, alt_text, size_bytes, created_at", { count: "exact" })
    .eq("bucket_id", "public-media")
    .order("created_at", { ascending: false })
    .range((current - 1) * PAGE_SIZE, current * PAGE_SIZE - 1);
  if (folder) query = query.eq("folder", folder);
  const [{ data: assets, count }, { data: folders }] = await Promise.all([
    query,
    staff.supabase.from("media_assets").select("folder").eq("bucket_id", "public-media"),
  ]);
  const folderNames = [...new Set((folders ?? []).map((f) => f.folder).filter(Boolean))].sort() as string[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (p: number) => `/admin/media?${new URLSearchParams({ ...(folder ? { folder } : {}), page: String(p) })}`;

  return (
    <>
      {saved === "alt" && <Notice>Description saved.</Notice>}
      {saved === "deleted" && <Notice>Photo deleted.</Notice>}
      {saved && /^\d+$/.test(saved) && <Notice>{saved === "1" ? "Photo uploaded." : `${saved} photos uploaded.`}</Notice>}
      <PageHeader title="Media library" intro="All photos uploaded to the website. Photos are public once uploaded — never upload documents with personal details." />

      {staff.can("media.create") && (
        <Card title="Upload photos" className="mb-6">
          <ActionForm action={uploadMedia} submitLabel="Upload" pendingLabel="Uploading…" inline>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-brand-900 md:col-span-3">
                Photos (JPEG, PNG, WebP or GIF, up to 10 MB each, 10 at a time)
                <input name="files" type="file" multiple required accept="image/jpeg,image/png,image/webp,image/gif" className="mt-1 block w-full text-sm" />
              </label>
              <label className="text-sm font-medium text-brand-900">
                Folder
                <input name="folder" defaultValue="library" pattern="[a-z0-9\-]{1,40}" maxLength={40} className={adminInput} />
              </label>
              <label className="text-sm font-medium text-brand-900 md:col-span-2">
                Description for screen readers
                <input name="alt_text" maxLength={300} placeholder="e.g. A caregiver walking with an older man in a garden" className={adminInput} />
              </label>
            </div>
          </ActionForm>
        </Card>
      )}

      {folderNames.length > 1 && (
        <nav aria-label="Folders" className="mb-4 flex flex-wrap gap-2 text-sm">
          <Link href="/admin/media" className={`rounded-full px-3 py-1 ${!folder ? "bg-brand-800 text-white" : "bg-white ring-1 ring-gray-200"}`}>All</Link>
          {folderNames.map((f) => (
            <Link key={f} href={`/admin/media?folder=${encodeURIComponent(f)}`} className={`rounded-full px-3 py-1 ${folder === f ? "bg-brand-800 text-white" : "bg-white ring-1 ring-gray-200"}`}>
              {f}
            </Link>
          ))}
        </nav>
      )}

      {!assets?.length ? (
        <Card>
          <p className="text-muted">No photos yet.</p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
              <a href={mediaUrl(a.object_path) ?? undefined} target="_blank" rel="noreferrer">
                <img src={mediaUrl(a.object_path) ?? undefined} alt={a.alt_text ?? ""} loading="lazy" className="aspect-[4/3] w-full bg-gray-100 object-cover" />
              </a>
              <div className="space-y-3 p-4 text-sm">
                <p className="text-xs text-muted">
                  {a.folder} · {size(a.size_bytes)} · {formatDateTime(a.created_at)}
                </p>
                <label className="block text-xs font-semibold text-brand-900">
                  Address (copy into other pages)
                  <input readOnly value={a.object_path} className={`${adminInput} font-mono text-xs`} />
                </label>
                {staff.can("media.edit") ? (
                  <ActionForm action={updateAltText} submitLabel="Save description" inline>
                    <input type="hidden" name="id" value={a.id} />
                    <label className="block text-xs font-semibold text-brand-900">
                      Description
                      <input name="alt_text" defaultValue={a.alt_text ?? ""} maxLength={300} className={adminInput} />
                    </label>
                  </ActionForm>
                ) : (
                  <p>{a.alt_text || <em className="text-muted">No description</em>}</p>
                )}
                {staff.can("media.delete") && (
                  <ActionForm action={deleteMedia} submitLabel="Delete photo" secondary confirm="Delete this photo? Any page still using it will show the purple placeholder instead.">
                    <input type="hidden" name="id" value={a.id} />
                  </ActionForm>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-4 text-sm">
          {current > 1 && <Link href={link(current - 1)} className="font-semibold text-brand-700 underline">← Newer</Link>}
          <span className="text-muted">Page {current} of {pages}</span>
          {current < pages && <Link href={link(current + 1)} className="font-semibold text-brand-700 underline">Older →</Link>}
        </nav>
      )}
    </>
  );
}
