import Link from "next/link";
import { addMyTimeOff, removeMyTimeOff, saveMyAvailability } from "@/app/portal/availability-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { AvailabilityFields } from "@/components/availability/AvailabilityFields";
import { TIME_OFF_KINDS } from "@/lib/matching";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "My availability" };

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const SAVED: Record<string, string> = { week: "Saved. The office will book visits when you're free.", off: "Time off added. The office won't book you on those days.", removed: "Time off removed." };

export default async function MyAvailability({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const worker = await requireWorker();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: rows }, { data: off }] = await Promise.all([
    worker.supabase.from("worker_availability").select("weekday, start_time, end_time").eq("worker_id", worker.user.id).order("weekday"),
    worker.supabase.from("worker_time_off").select("id, starts_on, ends_on, kind, note").eq("worker_id", worker.user.id).gte("ends_on", today).order("starts_on"),
  ]);

  return (
    <div className="space-y-8">
      <p>
        <Link href="/portal" className="text-sm font-semibold text-brand-700 underline">
          ← Today
        </Link>
      </p>
      {saved && SAVED[saved] && (
        <p role="status" className="rounded-2xl bg-green-50 p-4 font-semibold text-green-950 ring-1 ring-green-200">
          {SAVED[saved]}
        </p>
      )}
      <div>
        <h1 className="text-3xl font-bold text-brand-900">My availability</h1>
        <p className="mt-1 text-muted">Tell the office when you can usually work, and when you can&apos;t (leave, sickness, training).</p>
      </div>

      <section aria-labelledby="week-h">
        <h2 id="week-h" className="text-xl font-bold text-brand-900">
          My usual week
        </h2>
        <ActionForm action={saveMyAvailability} submitLabel="Save my week" pendingLabel="Saving…" className="mt-3">
          <AvailabilityFields rows={rows ?? []} />
        </ActionForm>
      </section>

      <section aria-labelledby="off-h">
        <h2 id="off-h" className="text-xl font-bold text-brand-900">
          Time off
        </h2>
        {off?.length ? (
          <ul className="mt-3 space-y-2">
            {off.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-100">
                <span>
                  <span className="block font-semibold text-brand-900">
                    {fmt(o.starts_on)}
                    {o.ends_on !== o.starts_on ? ` – ${fmt(o.ends_on)}` : ""}
                  </span>
                  <span className="block text-sm text-muted">
                    {TIME_OFF_KINDS.find((k) => k.value === o.kind)?.label}
                    {o.note ? ` · ${o.note}` : ""}
                  </span>
                </span>
                {o.starts_on > today && (
                  <ActionForm action={removeMyTimeOff} submitLabel="Remove" inline secondary confirm="Remove this time off?">
                    <input type="hidden" name="id" value={o.id} />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted">No time off booked.</p>
        )}
        <ActionForm action={addMyTimeOff} submitLabel="Add time off" pendingLabel="Saving…" className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-brand-900">
              First day
              <input name="starts_on" type="date" required min={today} className="mt-1 block min-h-11 w-full rounded-lg border border-brand-200 px-2 text-base" />
            </label>
            <label className="text-sm font-semibold text-brand-900">
              Last day
              <input name="ends_on" type="date" min={today} className="mt-1 block min-h-11 w-full rounded-lg border border-brand-200 px-2 text-base" />
            </label>
            <label className="text-sm font-semibold text-brand-900">
              Reason
              <select name="kind" defaultValue="leave" className="mt-1 block min-h-11 w-full rounded-lg border border-brand-200 bg-white px-2 text-base">
                {TIME_OFF_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-brand-900">
              Note (optional)
              <input name="note" maxLength={200} className="mt-1 block min-h-11 w-full rounded-lg border border-brand-200 px-2 text-base" />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">If you&apos;re sick today, also call the office so your visits can be covered.</p>
        </ActionForm>
      </section>
    </div>
  );
}
