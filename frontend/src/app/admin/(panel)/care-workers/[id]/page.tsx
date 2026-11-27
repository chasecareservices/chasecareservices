import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, PageHeader, formatDateTime } from "@/components/admin/ui";
import { ConcernBadge, Mood, ReportStatus, VisitStatus, formatVisitDate, hhmm } from "@/components/portal/ReportBits";
import { IncidentStatus, SeverityBadge } from "@/components/care/IncidentBits";
import { DocumentsPanel } from "@/components/admin/DocumentsPanel";
import { requireStaff } from "@/lib/admin/session";
import { phoneDigits, whatsappLink } from "@/lib/format";
import { formatIncidentTime, kindLabel } from "@/lib/incidents";

export const metadata = { title: "Care worker" };

export default async function CareWorkerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const staff = await requireStaff();
  if (!staff.can("clients.view") && !staff.can("care_ops.view")) redirect("/admin?denied=1");
  const { data: workers } = await staff.supabase.rpc("list_care_workers");
  const w = workers?.find((x) => x.id === id);
  if (!w) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const canCare = staff.can("care_ops.view");

  const [{ data: team }, { data: visits }, { data: reports }, { data: incidents }] = await Promise.all([
    staff.supabase.from("care_assignments").select("client:care_clients(id, full_name, area, is_active)").eq("worker_id", id).eq("is_active", true),
    canCare
      ? staff.supabase
          .from("care_shift_status")
          .select("id, client_id, shift_date, start_time, end_time, visit_status")
          .eq("worker_id", id)
          .gte("shift_date", new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10))
          .order("shift_date")
          .order("start_time")
          .limit(30)
      : Promise.resolve({ data: [] as never[] }),
    canCare
      ? staff.supabase
          .from("care_reports")
          .select("id, reference, visit_date, mood, concern_level, status, client:care_clients(full_name)")
          .eq("worker_id", id)
          .order("visit_date", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as never[] }),
    canCare
      ? staff.supabase.from("care_incidents").select("id, reference, occurred_at, kind, severity, status").eq("reported_by", id).order("occurred_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const clients = (team ?? []).map((t) => t.client as unknown as { id: string; full_name: string; area: string | null; is_active: boolean }).filter(Boolean);
  const clientName = new Map(clients.map((c) => [c.id, c.full_name]));
  const missed = (visits ?? []).filter((v) => v.visit_status === "missed").length;
  const upcoming = (visits ?? []).filter((v) => v.shift_date! >= today && v.visit_status !== "cancelled" && v.visit_status !== "done");

  return (
    <>
      <Link href="/admin/care-workers" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
        ← Care workers
      </Link>
      <div className="mt-3">
        <PageHeader title={w.full_name ?? w.email ?? "Care worker"} intro={w.is_active ? "Active care worker" : "Switched off: can't sign in to the portal"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {canCare && (
            <Card title="Visits">
              {missed > 0 && (
                <p className="mb-3 font-semibold text-red-800">
                  <span aria-hidden="true">! </span>
                  {missed} visit{missed === 1 ? "" : "s"} in the last 7 days with no report.
                </p>
              )}
              {!upcoming.length ? (
                <p className="text-sm text-muted">
                  No visits booked.{" "}
                  <Link href={`/admin/care-schedule?worker=${id}`} className="font-semibold text-brand-700 underline">
                    Book one
                  </Link>
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 text-sm">
                  {upcoming.slice(0, 10).map((v) => (
                    <li key={v.id!} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>
                        <strong className="text-brand-900">
                          {formatVisitDate(v.shift_date!)}, {hhmm(v.start_time!)}–{hhmm(v.end_time!)}
                        </strong>{" "}
                        · {clientName.get(v.client_id!) ?? "Client"}
                      </span>
                      <VisitStatus status={v.visit_status!} />
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/admin/care-schedule?worker=${id}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline">
                Full schedule for {(w.full_name ?? "").split(" ")[0] || "this care worker"}
              </Link>
            </Card>
          )}

          {canCare && (
            <Card title="Recent visit reports">
              {!reports?.length ? (
                <p className="text-sm text-muted">No reports yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100 text-sm">
                  {reports.map((r) => {
                    const c = r.client as unknown as { full_name: string } | null;
                    return (
                      <li key={r.id}>
                        <Link href={`/admin/care-reports/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 hover:bg-brand-50">
                          <span>
                            <strong className="text-brand-900">{c?.full_name}</strong> · {formatVisitDate(r.visit_date)} · <Mood mood={r.mood} />
                          </span>
                          <span className="flex gap-2">
                            <ConcernBadge level={r.concern_level} />
                            <ReportStatus status={r.status} />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {canCare && (incidents?.length ?? 0) > 0 && (
            <Card title="Incidents they reported">
              <ul className="divide-y divide-gray-100 text-sm">
                {incidents!.map((i) => (
                  <li key={i.id}>
                    <Link href={`/admin/incidents/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 hover:bg-brand-50">
                      <span>
                        <strong className="text-brand-900">{kindLabel(i.kind)}</strong> · {formatIncidentTime(i.occurred_at)} · {i.reference}
                      </span>
                      <span className="flex gap-2">
                        <SeverityBadge severity={i.severity} />
                        <IncidentStatus status={i.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <DocumentsPanel owner={{ kind: "worker", id, name: w.full_name ?? w.email ?? "Care worker" }} />
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Email</dt>
                <dd>
                  <a href={`mailto:${w.email}`} className="font-medium text-brand-700 underline">
                    {w.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="flex flex-wrap gap-3">
                  {w.phone ? (
                    <>
                      <a href={`tel:${phoneDigits(w.phone)}`} className="font-medium text-brand-700 underline">
                        {w.phone}
                      </a>
                      <a href={whatsappLink(w.phone)} target="_blank" rel="noopener noreferrer" className="font-medium text-green-800 underline">
                        WhatsApp
                      </a>
                    </>
                  ) : (
                    <span className="text-muted">Not given</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Last report</dt>
                <dd>{w.last_report_at ? formatDateTime(w.last_report_at) : "Never"}</dd>
              </div>
            </dl>
          </Card>
          <Card title={`Clients (${clients.length})`}>
            {!clients.length ? (
              <p className="text-sm text-muted">Not on any care team yet. Booking them a visit adds them to that client&apos;s care team.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {clients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/care-clients/${c.id}`} className="font-semibold text-brand-700 underline">
                      {c.full_name}
                    </Link>
                    {c.area && <span className="text-muted"> · {c.area}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
