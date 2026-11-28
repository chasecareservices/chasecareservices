import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAnnouncement, emailAnnouncement, saveAnnouncement } from "../../announcement-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AnnouncementFields } from "@/components/admin/AnnouncementFields";
import { Card, Notice, PageHeader, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Announcement" };
const AUDIENCE: Record<string, string> = { workers: "care workers", families: "families", both: "care workers and families" };

export default async function AnnouncementEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; n?: string }> }) {
  const { id } = await params;
  const { saved, n } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const staff = await requirePermission("communications.view");
  const { data: a } = await staff.supabase.from("portal_announcements").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  const canEdit = staff.can("communications.edit");
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/communications/announcements" className="text-sm font-medium text-brand-700 underline">
          ← Announcements
        </Link>
      </p>
      {saved === "1" && <Notice>Saved.{a.status === "published" ? " It shows in the portal from the start date." : " It's a draft: nobody sees it yet."}</Notice>}
      {saved === "emailed" && <Notice>Emailed to {n} {n === "1" ? "person" : "people"}.</Notice>}
      <PageHeader title={a.title} intro={`For ${AUDIENCE[a.audience]} · ${a.status === "published" ? "published" : "draft"}`} />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Edit">
          {canEdit ? (
            <ActionForm action={saveAnnouncement} submitLabel="Save announcement">
              <input type="hidden" name="id" value={a.id} />
              <AnnouncementFields a={a} />
            </ActionForm>
          ) : (
            <p className="whitespace-pre-line text-sm">{a.body}</p>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Email it">
            {a.emailed_at ? (
              <p className="text-sm">
                Emailed {formatDateTime(a.emailed_at)} to {a.emailed_count ?? 0} people.
              </p>
            ) : a.status !== "published" ? (
              <p className="text-sm text-muted">Publish it first, then you can email it to all {AUDIENCE[a.audience]}.</p>
            ) : canEdit ? (
              <>
                <p className="mb-3 text-sm text-muted">Sends it to every active {AUDIENCE[a.audience].replace(" and ", " and every ")} with an email address. Only once.</p>
                <ActionForm action={emailAnnouncement} submitLabel={`Email to all ${AUDIENCE[a.audience]}`} pendingLabel="Sending…" inline confirm="Send this announcement by email now?">
                  <input type="hidden" name="id" value={a.id} />
                </ActionForm>
              </>
            ) : null}
          </Card>
          {canEdit && (
            <Card title="Delete">
              <ActionForm action={deleteAnnouncement} submitLabel="Delete announcement" inline secondary confirm="Delete this announcement?">
                <input type="hidden" name="id" value={a.id} />
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
