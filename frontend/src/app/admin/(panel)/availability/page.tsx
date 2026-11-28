import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { TIME_OFF_KINDS, WEEKDAYS, weekOf } from "@/lib/matching";

export const metadata = { title: "Availability" };

const DAY = 86400_000;
const mins = (a: string, b: string) => (Number(b.slice(0, 2)) * 60 + Number(b.slice(3, 5))) - (Number(a.slice(0, 2)) * 60 + Number(a.slice(3, 5)));
const h = (m: number) => `${Math.round(m / 6) / 10}h`;

export default async function AvailabilityOverview({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const staff = await requirePermission("care_ops.view");
  const sb = staff.supabase;
  const today = new Date().toISOString().slice(0, 10);
  const { monday, sunday } = weekOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${monday}T00:00:00Z`) + i * DAY).toISOString().slice(0, 10));
  const [{ data: workers }, { data: availability }, { data: off }, { data: shifts }, { data: profiles }] = await Promise.all([
    sb.rpc("list_care_workers"),
    sb.from("worker_availability").select("worker_id, weekday, start_time, end_time"),
    sb.from("worker_time_off").select("worker_id, starts_on, ends_on, kind").lte("starts_on", sunday).gte("ends_on", monday),
    sb.from("care_shifts").select("worker_id, shift_date, start_time, end_time").neq("status", "cancelled").gte("shift_date", monday).lte("shift_date", sunday),
    sb.from("worker_profiles").select("worker_id, max_hours_week"),
  ]);
  const active = (workers ?? []).filter((w) => w.is_active);
  const shift = (d: number) => new Date(Date.parse(`${monday}T00:00:00Z`) + d * DAY).toISOString().slice(0, 10);
  const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <PageHeader
        title="Availability"
        intro="Who can work each day, who is off, and how many hours are already booked. Care workers update their own week in the portal."
        actions={
          <Link href="/admin/matching" className="inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
            Find a care worker
          </Link>
        }
      />
      <nav aria-label="Change week" className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/admin/availability?week=${shift(-7)}`} className="font-semibold text-brand-700 underline">
          ← Previous week
        </Link>
        <span className="font-semibold text-brand-900">
          {fmt(monday)} – {fmt(sunday)}
        </span>
        <Link href={`/admin/availability?week=${shift(7)}`} className="font-semibold text-brand-700 underline">
          Next week →
        </Link>
        {monday !== weekOf(today).monday && (
          <Link href="/admin/availability" className="text-brand-700 underline">
            This week
          </Link>
        )}
      </nav>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <caption className="sr-only">Care worker availability for the week of {fmt(monday)}</caption>
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-3">Care worker</th>
              {days.map((d, i) => (
                <th key={d} scope="col" className={`px-3 py-3 ${d === today ? "text-brand-800" : ""}`}>
                  {WEEKDAYS[i].slice(0, 3)} {new Date(`${d}T00:00:00Z`).getUTCDate()}
                </th>
              ))}
              <th scope="col" className="px-3 py-3">Week</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {active.map((w) => {
              const mine = (shifts ?? []).filter((s) => s.worker_id === w.id);
              const total = mine.reduce((s, x) => s + mins(x.start_time, x.end_time), 0);
              const max = (profiles ?? []).find((p) => p.worker_id === w.id)?.max_hours_week;
              const hasPattern = (availability ?? []).some((a) => a.worker_id === w.id);
              return (
                <tr key={w.id} className="align-top">
                  <th scope="row" className="px-3 py-3 font-semibold">
                    <Link href={`/admin/care-workers/${w.id}#availability`} className="text-brand-800 underline">
                      {w.full_name ?? w.email}
                    </Link>
                    {!hasPattern && <span className="block text-xs font-normal text-amber-800">Week not set</span>}
                  </th>
                  {days.map((d, i) => {
                    const o = (off ?? []).find((x) => x.worker_id === w.id && x.starts_on <= d && x.ends_on >= d);
                    const win = (availability ?? []).filter((a) => a.worker_id === w.id && a.weekday === i + 1);
                    const booked = mine.filter((s) => s.shift_date === d);
                    const bookedMin = booked.reduce((s, x) => s + mins(x.start_time, x.end_time), 0);
                    return (
                      <td key={d} className={`px-3 py-3 ${o ? "bg-amber-50" : win.length ? "bg-green-50/60" : ""}`}>
                        {o ? (
                          <span className="font-semibold text-amber-900">Off: {TIME_OFF_KINDS.find((k) => k.value === o.kind)?.label.split(" ")[0].toLowerCase()}</span>
                        ) : win.length ? (
                          <span className="text-green-900">{win.map((a) => `${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}`).join(", ")}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        {booked.length > 0 && (
                          <span className={`mt-1 block text-xs font-semibold ${o ? "text-red-800" : "text-brand-800"}`}>
                            {booked.length} {booked.length === 1 ? "visit" : "visits"} · {h(bookedMin)}
                            {o ? " (while off!)" : ""}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className={`px-3 py-3 font-semibold ${max && total / 60 > max ? "text-red-800" : ""}`}>
                    {h(total)}
                    {max ? <span className="block text-xs font-normal text-muted">of {max}h max</span> : null}
                  </td>
                </tr>
              );
            })}
            {!active.length && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted">
                  No active care workers.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Green: usually free that day. Amber: off. Visits booked while someone is off are shown in red.</p>
    </>
  );
}
