import Link from "next/link";
import { saveAnnouncement } from "../announcement-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AnnouncementFields } from "@/components/admin/AnnouncementFields";
import { Card, Notice, PageHeader, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Announcements" };
const AUDIENCE: Record<string, string> = { workers: "Care workers", families: "Families", both: "Care workers & families" };

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const staff = await requirePermission("communications.view");
  const { data } = await staff.supabase.from("portal_announcements").select("id, title, audience, status, important, publish_at, expires_at, emailed_at, emailed_count").order("publish_at", { ascending: false }).limit(100);
  const now = Date.now();
  const state = (a: NonNullable<typeof data>[number]) =>
    a.status !== "published" ? "Draft" : Date.parse(a.publish_at) > now ? "Scheduled" : a.expires_at && Date.parse(a.expires_at) <= now ? "Ended" : "Showing";
  return (
    <>
      {deleted && <Notice>Announcement deleted.</Notice>}
      <PageHeader title="Announcements" intro="Messages to care workers and families. They appear on their portal home page, and you can email them too." />
      <div className="mb-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Announcement</th>
              <th scope="col" className="px-4 py-3">For</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Emailed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data ?? []).map((a) => (
              <tr key={a.id} className="relative hover:bg-brand-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/communications/announcements/${a.id}`} className="font-semibold text-brand-800 underline after:absolute after:inset-0">
                    {a.title}
                  </Link>
                  {a.important && <span className="ml-2 rounded-full bg-red-100 px-2 text-xs font-semibold text-red-900">Important</span>}
                  <span className="block text-xs text-muted">From {formatDateTime(a.publish_at)}</span>
                </td>
                <td className="px-4 py-3">{AUDIENCE[a.audience]}</td>
                <td className="px-4 py-3">{state(a)}</td>
                <td className="px-4 py-3">{a.emailed_at ? `${a.emailed_count ?? 0} people` : "—"}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No announcements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {staff.can("communications.edit") && (
        <Card title="New announcement" className="max-w-4xl">
          <ActionForm action={saveAnnouncement} submitLabel="Save announcement">
            <AnnouncementFields />
          </ActionForm>
        </Card>
      )}
    </>
  );
}
