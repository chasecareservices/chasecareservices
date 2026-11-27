import Link from "next/link";
import { bookVisit } from "../care-schedule/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, adminInput } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { compliance, stateInline, type Credential } from "@/lib/credentials";
import { rankWorkers, skillLabel, weekOf, type MatchWorker } from "@/lib/matching";

export const metadata = { title: "Find a care worker" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const minutes = (a: string, b: string) => {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return m(b) - m(a);
};

type Props = { searchParams: Promise<{ client?: string; date?: string; start?: string; end?: string; weeks?: string }> };

export default async function MatchingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const staff = await requirePermission("care_ops.view");
  const sb = staff.supabase;
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const date = DATE.test(sp.date ?? "") ? sp.date! : tomorrow;
  const start = TIME.test(sp.start ?? "") ? sp.start! : "09:00";
  const end = TIME.test(sp.end ?? "") ? sp.end! : "13:00";
  const weeks = Math.min(12, Math.max(1, Number(sp.weeks) || 1));
  const clientId = /^[0-9a-f-]{36}$/.test(sp.client ?? "") ? sp.client! : "";

  const { data: clients } = await sb.from("care_clients").select("id, full_name, is_active").eq("is_active", true).order("full_name");
  const ready = clientId && end > start;

  let ranked: ReturnType<typeof rankWorkers> = [];
  let client: { id: string; full_name: string; required_skills: string[]; preferred_gender: string | null; languages: string[]; home_lat: number | null; home_lng: number | null } | null = null;
  if (ready) {
    const { monday, sunday } = weekOf(date);
    const [{ data: c }, { data: workers }, { data: profiles }, { data: availability }, { data: off }, { data: shifts }, { data: team }, { data: certs }, { data: creds }] = await Promise.all([
      sb.from("care_clients").select("id, full_name, required_skills, preferred_gender, languages, home_lat, home_lng").eq("id", clientId).maybeSingle(),
      sb.rpc("list_care_workers"),
      sb.from("worker_profiles").select("*"),
      sb.from("worker_availability").select("worker_id, weekday, start_time, end_time"),
      sb.from("worker_time_off").select("worker_id, starts_on, ends_on, kind").lte("starts_on", date).gte("ends_on", date),
      sb.from("care_shifts").select("worker_id, shift_date, start_time, end_time, client:care_clients(full_name)").neq("status", "cancelled").gte("shift_date", monday).lte("shift_date", sunday),
      sb.from("care_assignments").select("worker_id").eq("client_id", clientId).eq("is_active", true),
      sb.rpc("care_worker_certificates"),
      sb.from("worker_credentials").select("id, worker_id, doc_type, title, reference, issued_on, expires_on, status, note, created_at"),
    ]);
    client = c;
    if (c) {
      const list: MatchWorker[] = (workers ?? [])
        .filter((w) => w.is_active)
        .map((w) => {
          const p = (profiles ?? []).find((x) => x.worker_id === w.id);
          const mine = (shifts ?? []).filter((s) => s.worker_id === w.id);
          return {
            id: w.id,
            name: w.full_name ?? w.email ?? "Care worker",
            gender: p?.gender ?? null,
            skills: p?.skills ?? [],
            certificates: (certs ?? []).filter((x) => x.worker_id === w.id).map((x) => x.course_title),
            languages: p?.languages ?? [],
            lat: p?.home_lat ?? null,
            lng: p?.home_lng ?? null,
            travel_km: p?.travel_km ?? 15,
            max_hours_week: p?.max_hours_week ?? null,
            availability: (availability ?? []).filter((a) => a.worker_id === w.id),
            time_off: (off ?? []).filter((o) => o.worker_id === w.id),
            visits_that_day: mine
              .filter((s) => s.shift_date === date)
              .map((s) => ({ start_time: s.start_time, end_time: s.end_time, client: (s.client as unknown as { full_name: string } | null)?.full_name ?? "another client" })),
            week_minutes: mine.reduce((sum, s) => sum + minutes(s.start_time, s.end_time), 0),
            on_care_team: (team ?? []).some((t) => t.worker_id === w.id),
            // Checked against the visit date: a document valid today may have expired by then.
            ...(() => {
              const rows = compliance((creds ?? []).filter((x) => x.worker_id === w.id) as Credential[], p?.skills ?? [], date).filter((r) => r.required);
              return {
                document_blocks: rows.filter((r) => r.state === "expired" || r.state === "rejected").map((r) => `${r.label}: ${stateInline(r)}`),
                document_warnings: rows.filter((r) => r.state === "missing").map((r) => `${r.label}: not recorded`),
              };
            })(),
          };
        });
      ranked = rankWorkers({ ...c, lat: c.home_lat, lng: c.home_lng }, { date, start, end }, list);
    }
  }
  const canBook = staff.can("care_ops.edit");
  const dayName = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <>
      <PageHeader
        title="Find a care worker"
        intro="Choose the client and the visit time. Care workers are ranked by availability, skills and certificates, the client's preferences, distance and continuity. You make the final choice."
      />
      <Card className="mb-6">
        <form action="/admin/matching" className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-end">
          <label className="text-sm font-medium text-brand-900">
            Client
            <select name="client" required defaultValue={clientId} className={adminInput}>
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
          <label className="text-sm font-medium text-brand-900">
            Date
            <input name="date" type="date" required defaultValue={date} className={adminInput} />
          </label>
          <label className="text-sm font-medium text-brand-900">
            From
            <input name="start" type="time" required defaultValue={start} className={adminInput} />
          </label>
          <label className="text-sm font-medium text-brand-900">
            To
            <input name="end" type="time" required defaultValue={end} className={adminInput} />
          </label>
          <label className="text-sm font-medium text-brand-900">
            Repeat
            <select name="weeks" defaultValue={String(weeks)} className={adminInput}>
              {[1, 2, 4, 6, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "Just once" : `Weekly × ${n}`}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-full bg-brand-800 px-5 font-semibold text-white hover:bg-brand-700">
            Find
          </button>
        </form>
        {clientId && end <= start && <p className="mt-3 text-sm text-red-800">The finish time must be after the start time.</p>}
      </Card>

      {client && (
        <section aria-labelledby="results-h">
          <h2 id="results-h" className="text-xl font-bold text-brand-900">
            Best matches for {client.full_name}, {dayName}, {start}–{end}
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Needs: {client.required_skills.length ? client.required_skills.map(skillLabel).join(", ") : "none recorded"}
            {client.preferred_gender ? ` · prefers a ${client.preferred_gender} carer` : ""}
            {client.languages.length ? ` · speaks ${client.languages.join(", ")}` : ""} ·{" "}
            <Link href={`/admin/care-clients/${client.id}#needs`} className="font-semibold text-brand-700 underline">
              edit needs
            </Link>
            {weeks > 1 ? ` · Checked for the first visit; ${weeks} weekly visits will be booked.` : ""}
          </p>
          <ol className="space-y-3">
            {ranked.map((m, i) => (
              <li key={m.worker.id} className={`rounded-2xl bg-white p-5 ring-1 ${m.blocked ? "opacity-75 ring-gray-200" : i === 0 ? "ring-2 ring-accent-400" : "ring-gray-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-brand-900">
                      {i === 0 && !m.blocked && <span className="mr-2 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-900">Best match</span>}
                      <Link href={`/admin/care-workers/${m.worker.id}`} className="hover:underline">
                        {m.worker.name}
                      </Link>
                    </h3>
                    {m.blocked && <p className="text-sm font-semibold text-red-800">Not available for this visit</p>}
                  </div>
                  {canBook && !m.blocked && (
                    <ActionForm action={bookVisit} submitLabel={`Book ${m.worker.name.split(" ")[0]}`} pendingLabel="Booking…" inline>
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="worker_id" value={m.worker.id} />
                      <input type="hidden" name="shift_date" value={date} />
                      <input type="hidden" name="start_time" value={start} />
                      <input type="hidden" name="end_time" value={end} />
                      <input type="hidden" name="repeat_weeks" value={weeks} />
                    </ActionForm>
                  )}
                </div>
                <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {m.checks.map((c, k) => (
                    <li key={k} className="flex gap-2">
                      <span aria-hidden="true" className={c.ok === true ? "text-green-700" : c.ok === false ? "text-red-700" : "text-gray-500"}>
                        {c.ok === true ? "✓" : c.ok === false ? "✗" : "•"}
                      </span>
                      <span>
                        <span className="sr-only">{c.ok === true ? "Good: " : c.ok === false ? "Problem: " : "Note: "}</span>
                        {c.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {!ranked.length && <li className="rounded-2xl bg-white p-6 text-muted ring-1 ring-gray-200">No active care workers yet.</li>}
          </ol>
        </section>
      )}
    </>
  );
}
