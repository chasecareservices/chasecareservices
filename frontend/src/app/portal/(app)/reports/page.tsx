import Link from "next/link";
import { ConcernBadge, Mood, ReportStatus, formatVisitDate } from "@/components/portal/ReportBits";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "My reports" };

export default async function MyReportsPage() {
  const worker = await requireWorker();
  const { data: reports } = await worker.supabase
    .from("care_reports")
    .select("id, reference, visit_date, mood, concern_level, status, office_note, client:care_clients(full_name, preferred_name)")
    .eq("worker_id", worker.user.id)
    .order("visit_date", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-900">My reports</h1>
      <p className="mt-1 text-muted">Everything you&apos;ve sent, newest first. “Read by the office” means someone has checked it.</p>
      {!reports?.length ? (
        <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-brand-100">
          <p className="text-muted">You haven&apos;t sent any reports yet.</p>
          <Link href="/portal/report/new" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-accent-500 px-5 font-semibold text-brand-950">
            Write your first report
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-brand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-brand-100">
          {reports.map((r) => {
            const client = r.client as unknown as { full_name: string; preferred_name: string | null } | null;
            return (
              <li key={r.id}>
                <Link href={`/portal/report/${r.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-brand-50">
                  <span className="min-w-0">
                    <span className="block font-semibold text-brand-900">{client?.preferred_name || client?.full_name}</span>
                    <span className="block text-sm text-muted">
                      {formatVisitDate(r.visit_date)} · <Mood mood={r.mood} /> · {r.reference}
                    </span>
                    {r.office_note && <span className="mt-1 block truncate text-sm text-green-800">💬 {r.office_note}</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <ReportStatus status={r.status} />
                    <ConcernBadge level={r.concern_level} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
