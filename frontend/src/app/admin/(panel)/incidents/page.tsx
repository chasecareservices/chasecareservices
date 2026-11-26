import Link from "next/link";
import { IncidentStatus, SeverityBadge } from "@/components/care/IncidentBits";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { formatIncidentTime, kindLabel } from "@/lib/incidents";

export const metadata = { title: "Incidents" };

const FILTERS = [
  { key: "open", label: "Needs follow-up" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
] as const;

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "open" } = await searchParams;
  const staff = await requirePermission("care_ops.view");
  let q = staff.supabase
    .from("care_incidents")
    .select("id, reference, occurred_at, kind, severity, status, client:care_clients(full_name), reporter:profiles!care_incidents_reported_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (show === "open") q = q.neq("status", "closed");
  if (show === "closed") q = q.eq("status", "closed");
  const { data: list } = await q;
  // Serious ones first while they need follow-up.
  const rank: Record<string, number> = { serious: 0, moderate: 1, minor: 2 };
  const rows = show === "open" ? [...(list ?? [])].sort((a, b) => rank[a.severity] - rank[b.severity]) : (list ?? []);

  return (
    <>
      <PageHeader
        title="Incidents"
        intro="Falls, injuries, medicine mistakes and safeguarding worries. Follow each one up, then close it with what was done."
        actions={
          staff.can("care_ops.edit") ? (
            <Link href="/admin/incidents/new" className="inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Log an incident
            </Link>
          ) : null
        }
      />
      <nav aria-label="Filter incidents" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/incidents?show=${f.key}`}
            aria-current={show === f.key ? "page" : undefined}
            className={`min-h-10 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${show === f.key ? "bg-brand-800 text-white ring-brand-800" : "bg-white text-brand-800 ring-gray-200 hover:bg-brand-50"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {!rows.length ? (
        <p className="rounded-2xl bg-white p-6 text-muted ring-1 ring-gray-200">{show === "open" ? "Nothing needs follow-up. 🎉" : "No incidents here."}</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
          {rows.map((r) => {
            const client = r.client as unknown as { full_name: string } | null;
            const reporter = r.reporter as unknown as { full_name: string | null } | null;
            return (
              <li key={r.id}>
                <Link href={`/admin/incidents/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-brand-50">
                  <span>
                    <span className="block font-semibold text-brand-900">
                      {kindLabel(r.kind)} · {client?.full_name}
                    </span>
                    <span className="block text-sm text-muted">
                      {formatIncidentTime(r.occurred_at)} · reported by {reporter?.full_name ?? "staff"} · {r.reference}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <SeverityBadge severity={r.severity} />
                    <IncidentStatus status={r.status} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
