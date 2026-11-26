import Link from "next/link";
import { IncidentStatus, SeverityBadge } from "@/components/care/IncidentBits";
import { formatIncidentTime, kindLabel } from "@/lib/incidents";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "My incident reports" };

export default async function MyIncidentsPage() {
  const worker = await requireWorker();
  const { data: list } = await worker.supabase
    .from("care_incidents")
    .select("id, reference, occurred_at, kind, severity, status, client:care_clients(full_name, preferred_name)")
    .eq("reported_by", worker.user.id)
    .order("occurred_at", { ascending: false })
    .limit(100);
  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-900">My incident reports</h1>
      <Link href="/portal/incident/new" className="mt-4 inline-flex min-h-12 items-center rounded-full border-2 border-red-700 bg-white px-5 font-semibold text-red-800 hover:bg-red-50">
        <span aria-hidden="true" className="mr-2">⚠</span>Report an incident
      </Link>
      {!list?.length ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-muted ring-1 ring-brand-100">You haven&apos;t reported any incidents.</p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-brand-100">
          {list.map((r) => {
            const c = r.client as unknown as { full_name: string; preferred_name: string | null } | null;
            return (
              <li key={r.id}>
                <Link href={`/portal/incident/${r.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-brand-50">
                  <span>
                    <span className="block font-semibold text-brand-900">
                      {kindLabel(r.kind)} · {c?.preferred_name || c?.full_name}
                    </span>
                    <span className="block text-sm text-muted">
                      {formatIncidentTime(r.occurred_at)} · {r.reference}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    <SeverityBadge severity={r.severity} />
                    <IncidentStatus status={r.status} />
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
