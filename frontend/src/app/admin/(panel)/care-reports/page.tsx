import Link from "next/link";
import { Card, PageHeader, formatDateTime } from "@/components/admin/ui";
import { ConcernBadge, Mood, formatVisitDate } from "@/components/portal/ReportBits";
import { requirePermission } from "@/lib/admin/session";
import { visitTimes } from "@/lib/care";

export const metadata = { title: "Care reports" };

const VIEWS = [
  { key: "to-read", label: "To read" },
  { key: "urgent", label: "Urgent" },
  { key: "all", label: "All reports" },
] as const;

export default async function CareReportsPage({ searchParams }: { searchParams: Promise<{ view?: string; client?: string }> }) {
  const { view: rawView, client } = await searchParams;
  const view = VIEWS.some((v) => v.key === rawView) ? rawView! : "to-read";
  const staff = await requirePermission("care_ops.view");

  let query = staff.supabase
    .from("care_reports")
    .select(
      "id, reference, visit_date, start_time, end_time, mood, concern_level, status, summary, submitted_at, client:care_clients(id, full_name, preferred_name), worker:profiles!care_reports_worker_id_fkey(full_name)",
    )
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (view === "to-read") query = query.eq("status", "submitted");
  if (view === "urgent") query = query.eq("concern_level", "urgent");
  if (client) query = query.eq("client_id", client);

  const [{ data: reports }, { data: counts }, { data: clients }] = await Promise.all([
    query,
    staff.supabase.rpc("care_report_counts"),
    staff.supabase.from("care_clients").select("id, full_name").order("full_name"),
  ]);
  const c = counts?.[0] ?? { to_read: 0, urgent: 0, monitor: 0 };
  // Most serious first in the inbox: urgent, then "keep an eye on", then the rest.
  const rank = { urgent: 0, monitor: 1, none: 2 } as Record<string, number>;
  const rows = [...(reports ?? [])].sort((a, b) => (view === "to-read" ? rank[a.concern_level] - rank[b.concern_level] : 0));

  return (
    <>
      <PageHeader
        title="Care reports"
        intro="Reports care workers send after each visit. Read them, reply with a note, and act on concerns."
        actions={
          <Link href="/admin/care-clients" className="inline-flex min-h-11 items-center rounded-full border border-brand-300 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">
            Clients &amp; care workers
          </Link>
        }
      />

      {Number(c.urgent) > 0 && (
        <p role="alert" className="mb-4 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 font-semibold text-red-800">
          <span aria-hidden="true">‼ </span>
          {Number(c.urgent) === 1 ? "1 urgent report needs" : `${c.urgent} urgent reports need`} attention today.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter reports" className="flex flex-wrap gap-2">
          {VIEWS.map((v) => {
            const n = v.key === "to-read" ? Number(c.to_read) : v.key === "urgent" ? Number(c.urgent) : null;
            const active = v.key === view;
            return (
              <Link
                key={v.key}
                href={`/admin/care-reports?view=${v.key}${client ? `&client=${client}` : ""}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
                  active ? "bg-brand-800 text-white" : "bg-white text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50"
                }`}
              >
                {v.label}
                {n !== null && n > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20" : v.key === "urgent" ? "bg-red-100 text-red-800" : "bg-accent-100 text-accent-700"}`}>
                    {n}
                    {v.key === "urgent" ? " unread" : ""}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <form action="/admin/care-reports" className="flex items-center gap-2 text-sm">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="client-filter" className="font-medium text-brand-900">
            Client
          </label>
          <select id="client-filter" name="client" defaultValue={client ?? ""} className="min-h-10 rounded-lg border border-gray-300 bg-white px-3">
            <option value="">Everyone</option>
            {(clients ?? []).map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.full_name}
              </option>
            ))}
          </select>
          <button type="submit" className="min-h-10 rounded-full bg-brand-800 px-4 font-semibold text-white">
            Show
          </button>
        </form>
      </div>

      {!rows.length ? (
        <Card>
          <p className="text-muted">
            {view === "to-read" ? "All caught up — there are no reports waiting to be read." : "No reports match this filter."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const cl = r.client as unknown as { full_name: string; preferred_name: string | null } | null;
            const w = r.worker as unknown as { full_name: string | null } | null;
            const unread = r.status === "submitted";
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/care-reports/${r.id}`}
                  className={`block rounded-2xl border-l-8 bg-white p-4 shadow-sm ring-1 ring-gray-200 transition hover:ring-brand-300 sm:p-5 ${
                    r.concern_level === "urgent" ? "border-l-red-600" : r.concern_level === "monitor" ? "border-l-amber-500" : "border-l-brand-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-brand-900">
                        {unread && (
                          <span className="mr-2 inline-flex rounded-full bg-accent-100 px-2 py-0.5 align-middle text-xs font-bold text-accent-700">New</span>
                        )}
                        {cl?.full_name}
                        <span className="font-normal text-muted"> · by {w?.full_name ?? "care worker"}</span>
                      </p>
                      <p className="text-sm text-muted">
                        Visit {formatVisitDate(r.visit_date)}, {visitTimes(r.start_time, r.end_time)} · <Mood mood={r.mood} /> · {r.reference}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConcernBadge level={r.concern_level} />
                      {!unread && <span className="text-sm font-semibold text-green-700">✓ Read</span>}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-ink">{r.summary}</p>
                  <p className="mt-1 text-xs text-muted">Received {formatDateTime(r.submitted_at)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
