import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { eventDate, eventKindLabel, eventTime } from "@/lib/events";

export const metadata = { title: "Events" };

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  published: "bg-green-100 text-green-900",
  cancelled: "bg-red-100 text-red-900",
  archived: "bg-gray-100 text-gray-600",
};

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const { past } = await searchParams;
  const staff = await requirePermission("community.view");
  await staff.supabase.rpc("ensure_forums");
  const now = new Date(Date.now() - 6 * 3600_000).toISOString();
  let q = staff.supabase.from("community_events").select("id, title, kind, topic, starts_at, ends_at, status, capacity, venue");
  q = past ? q.lt("starts_at", now).order("starts_at", { ascending: false }).limit(100) : q.gte("starts_at", now).order("starts_at").limit(100);
  const { data: events } = await q;
  const ids = (events ?? []).map((e) => e.id);
  const { data: regs } = ids.length ? await staff.supabase.from("event_registrations").select("event_id, status").in("event_id", ids) : { data: [] };
  const count = (id: string, s: string[]) => (regs ?? []).filter((r) => r.event_id === id && s.includes(r.status)).length;

  return (
    <>
      <PageHeader
        title="Events & Monthly Forum"
        intro="The Monthly Forum is created automatically for every third Thursday: add the topic, speaker and venue. Add other community events, outreach and volunteering here too."
        actions={
          staff.can("community.create") ? (
            <Link href="/admin/events/new" className="inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Add an event
            </Link>
          ) : null
        }
      />
      <nav aria-label="Which events" className="mb-4 flex gap-2 text-sm">
        {[
          ["", "Coming up"],
          ["1", "Past"],
        ].map(([k, l]) => (
          <Link
            key={l}
            href={k ? "/admin/events?past=1" : "/admin/events"}
            aria-current={(past ?? "") === k ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-4 font-semibold ${(past ?? "") === k ? "bg-brand-800 text-white" : "bg-white text-brand-800 ring-1 ring-gray-200"}`}
          >
            {l}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Event</th>
              <th scope="col" className="px-4 py-3">When</th>
              <th scope="col" className="px-4 py-3">Registered</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(events ?? []).map((e) => {
              const needsDetails = e.kind === "forum" && (!e.topic || !e.venue || e.venue === "To be confirmed");
              return (
                <tr key={e.id} className="relative hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/events/${e.id}`} className="font-semibold text-brand-800 underline after:absolute after:inset-0">
                      {e.title}
                    </Link>
                    <span className="block text-xs text-muted">
                      {eventKindLabel(e.kind)}
                      {e.topic ? ` · ${e.topic}` : ""}
                    </span>
                    {needsDetails && !past && <span className="mt-1 block text-xs font-semibold text-amber-800">Add the topic and venue</span>}
                  </td>
                  <td className="px-4 py-3">
                    {eventDate(e.starts_at)}
                    <span className="block text-xs text-muted">{eventTime(e.starts_at, e.ends_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {past ? `${count(e.id, ["attended"])} came of ${count(e.id, ["registered", "attended", "no_show"])}` : count(e.id, ["registered", "attended"])}
                    {e.capacity && !past ? <span className="text-muted"> / {e.capacity}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[e.status]}`}>{e.status[0].toUpperCase() + e.status.slice(1)}</span>
                  </td>
                </tr>
              );
            })}
            {!events?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No events.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
