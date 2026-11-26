import Link from "next/link";
import { bookVisit, cancelVisit } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput } from "@/components/admin/ui";
import { VisitStatus, formatVisitDate, hhmm } from "@/components/portal/ReportBits";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Visit schedule" };

const DAY = 86400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Monday of the week containing `date` (Ghana is on UTC). */
function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ week?: string; worker?: string; saved?: string }> }) {
  const { week, worker, saved } = await searchParams;
  const staff = await requirePermission("care_ops.view");
  const today = iso(new Date());
  const monday = mondayOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const sunday = new Date(monday.getTime() + 6 * DAY);
  const days = Array.from({ length: 7 }, (_, i) => iso(new Date(monday.getTime() + i * DAY)));

  let q = staff.supabase
    .from("care_shift_status")
    .select("id, client_id, worker_id, shift_date, start_time, end_time, notes, visit_status, report_id, report_reference")
    .gte("shift_date", iso(monday))
    .lte("shift_date", iso(sunday))
    .order("shift_date")
    .order("start_time");
  if (worker) q = q.eq("worker_id", worker);
  const [{ data: visits }, { data: missed }, { data: clients }, { data: workers }] = await Promise.all([
    q,
    staff.supabase
      .from("care_shift_status")
      .select("id, client_id, worker_id, shift_date, start_time, end_time")
      .eq("visit_status", "missed")
      .gte("shift_date", iso(new Date(Date.now() - 7 * DAY)))
      .order("shift_date", { ascending: false }),
    staff.supabase.from("care_clients").select("id, full_name").eq("is_active", true).order("full_name"),
    staff.supabase.rpc("list_care_workers"),
  ]);
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
  const workerName = new Map((workers ?? []).map((w) => [w.id, w.full_name ?? w.email]));
  const link = (d: Date) => `/admin/care-schedule?week=${iso(d)}${worker ? `&worker=${worker}` : ""}`;
  const canEdit = staff.can("care_ops.edit");

  return (
    <>
      {saved === "cancelled" && <Notice>Visit cancelled. The care worker no longer sees it.</Notice>}
      {saved && /^\d+$/.test(saved) && <Notice>{saved === "1" ? "Visit booked." : `${saved} weekly visits booked.`} The care worker sees them in their portal.</Notice>}
      <PageHeader title="Visit schedule" intro="Book visits, see who is where, and spot visits with no report." />

      {missed && missed.length > 0 && (
        <section aria-labelledby="missed-h" className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <h2 id="missed-h" className="font-bold text-red-900">
            <span aria-hidden="true">! </span>
            {missed.length === 1 ? "1 visit" : `${missed.length} visits`} in the last 7 days with no report
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-red-950">
            {missed.map((m) => (
              <li key={m.id!}>
                {formatVisitDate(m.shift_date!)}, {hhmm(m.start_time!)}–{hhmm(m.end_time!)}: {clientName.get(m.client_id!) ?? "Client"} with{" "}
                {workerName.get(m.worker_id!) ?? "care worker"}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-red-900">Call the care worker to check the visit happened, and ask them to send the report.</p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="Week" className="flex items-center gap-2">
              <Link href={link(new Date(monday.getTime() - 7 * DAY))} className="min-h-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50">
                ← Previous week
              </Link>
              <Link href={link(new Date())} className="min-h-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50">
                This week
              </Link>
              <Link href={link(new Date(monday.getTime() + 7 * DAY))} className="min-h-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50">
                Next week →
              </Link>
            </nav>
            <form action="/admin/care-schedule" className="flex items-center gap-2 text-sm">
              <input type="hidden" name="week" value={iso(monday)} />
              <label htmlFor="worker-filter" className="font-medium text-brand-900">
                Care worker
              </label>
              <select id="worker-filter" name="worker" defaultValue={worker ?? ""} className="min-h-10 rounded-lg border border-gray-300 bg-white px-3">
                <option value="">Everyone</option>
                {(workers ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name ?? w.email}
                  </option>
                ))}
              </select>
              <button type="submit" className="min-h-10 rounded-full bg-brand-800 px-4 font-semibold text-white">
                Show
              </button>
            </form>
          </div>
          <h2 className="mb-3 text-lg font-semibold text-brand-900">
            Week of {formatVisitDate(iso(monday))} – {formatVisitDate(iso(sunday))}
          </h2>
          <ol className="space-y-3">
            {days.map((d) => {
              const list = (visits ?? []).filter((v) => v.shift_date === d);
              return (
                <li key={d} className={`rounded-2xl bg-white p-4 ring-1 ${d === today ? "ring-2 ring-brand-500" : "ring-gray-200"}`}>
                  <h3 className="font-semibold text-brand-900">
                    {formatVisitDate(d)} {d === today && <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">Today</span>}
                  </h3>
                  {!list.length ? (
                    <p className="mt-1 text-sm text-muted">No visits.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-gray-100">
                      {list.map((v) => (
                        <li key={v.id!} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <span>
                            <strong className="text-brand-900">
                              {hhmm(v.start_time!)}–{hhmm(v.end_time!)}
                            </strong>{" "}
                            {clientName.get(v.client_id!) ?? "Client"} · {workerName.get(v.worker_id!) ?? "care worker"}
                            {v.notes && <span className="block text-muted">{v.notes}</span>}
                          </span>
                          <span className="flex flex-wrap items-center gap-2">
                            {v.report_id ? (
                              <Link href={`/admin/care-reports/${v.report_id}`} className="font-semibold text-brand-700 underline">
                                {v.report_reference}
                              </Link>
                            ) : null}
                            <VisitStatus status={v.visit_status!} />
                            {canEdit && v.visit_status === "upcoming" && (
                              <ActionForm action={cancelVisit} submitLabel="Cancel" secondary confirm="Cancel this visit? The care worker will no longer see it.">
                                <input type="hidden" name="id" value={v.id!} />
                                <input type="hidden" name="week" value={iso(monday)} />
                              </ActionForm>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {canEdit && (
          <Card title="Book a visit" className="h-fit">
            <ActionForm action={bookVisit} submitLabel="Book visit" inline>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-brand-900">
                  Client
                  <select name="client_id" required className={adminInput} defaultValue="">
                    <option value="" disabled>
                      Choose…
                    </option>
                    {(clients ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-brand-900">
                  Care worker
                  <select name="worker_id" required className={adminInput} defaultValue={worker ?? ""}>
                    <option value="" disabled>
                      Choose…
                    </option>
                    {(workers ?? [])
                      .filter((w) => w.is_active)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.full_name ?? w.email}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-brand-900">
                  Date
                  <input type="date" name="shift_date" required min={today} defaultValue={today} className={adminInput} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm font-medium text-brand-900">
                    Start
                    <input type="time" name="start_time" required step={300} defaultValue="09:00" className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    Finish
                    <input type="time" name="end_time" required step={300} defaultValue="13:00" className={adminInput} />
                  </label>
                </div>
                <label className="block text-sm font-medium text-brand-900">
                  Repeat every week for
                  <select name="repeat_weeks" defaultValue="1" className={adminInput}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? "Just this once" : `${n} weeks`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-brand-900">
                  Note for the care worker (optional)
                  <input name="notes" maxLength={500} placeholder="e.g. After school — meet at the gate" className={adminInput} />
                </label>
                <p className="text-xs text-muted">Make sure the care worker is on this client&apos;s care team, so they can see the care plan.</p>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
