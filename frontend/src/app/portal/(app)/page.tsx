import Link from "next/link";
import { ConcernBadge, Mood, ReportStatus, formatVisitDate } from "@/components/portal/ReportBits";
import { todayInGhana } from "@/lib/care";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Today" };

function greeting(now = new Date()) {
  const h = now.getUTCHours(); // Ghana is on UTC
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function PortalHome() {
  const worker = await requireWorker();
  const today = todayInGhana();
  const [{ data: clients }, { data: recent }, { data: todays }] = await Promise.all([
    worker.supabase.from("care_clients").select("id, full_name, preferred_name, area, care_summary").order("full_name"),
    worker.supabase
      .from("care_reports")
      .select("id, reference, visit_date, mood, concern_level, status, office_note, client:care_clients(full_name, preferred_name)")
      .eq("worker_id", worker.user.id)
      .order("submitted_at", { ascending: false })
      .limit(5),
    worker.supabase.from("care_reports").select("client_id").eq("worker_id", worker.user.id).eq("visit_date", today),
  ]);
  const reportedToday = new Set((todays ?? []).map((r) => r.client_id));
  const notes = (recent ?? []).filter((r) => r.office_note);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-brand-900">
          {greeting()}, {worker.firstName}
        </h1>
        <p className="mt-1 text-muted">
          {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date())}
        </p>
      </section>

      {notes.length > 0 && (
        <section aria-labelledby="notes-h" className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <h2 id="notes-h" className="font-bold text-green-900">
            <span aria-hidden="true">💬 </span>A note from the office
          </h2>
          <p className="mt-1 text-green-900">“{notes[0].office_note}”</p>
          <Link href={`/portal/report/${notes[0].id}`} className="mt-2 inline-block text-sm font-semibold text-green-900 underline underline-offset-4">
            On your report {notes[0].reference}
          </Link>
        </section>
      )}

      <section aria-labelledby="clients-h">
        <h2 id="clients-h" className="text-xl font-bold text-brand-900">
          Who are you caring for today?
        </h2>
        {!clients?.length ? (
          <p className="mt-3 rounded-2xl bg-white p-5 text-muted ring-1 ring-brand-100">
            You haven&apos;t been given any clients yet. The office will add them here — call the office if you&apos;re expecting a visit.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {clients.map((c) => {
              const done = reportedToday.has(c.id);
              return (
                <li key={c.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-brand-900">{c.preferred_name || c.full_name}</p>
                      {c.preferred_name && <p className="text-sm text-muted">{c.full_name}</p>}
                      {c.area && <p className="mt-0.5 text-sm text-muted">📍 {c.area}</p>}
                    </div>
                    {done && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-800">
                        <span aria-hidden="true">✓ </span>Report sent today
                      </span>
                    )}
                  </div>
                  {c.care_summary && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-semibold text-brand-700">Care notes</summary>
                      <p className="mt-1 whitespace-pre-line text-ink">{c.care_summary}</p>
                    </details>
                  )}
                  <Link
                    href={`/portal/report/new?client=${c.id}`}
                    className={`mt-4 flex min-h-12 items-center justify-center rounded-full px-5 font-semibold ${
                      done ? "border-2 border-brand-800 text-brand-800 hover:bg-brand-50" : "bg-accent-500 text-brand-950 hover:bg-accent-400"
                    }`}
                  >
                    {done ? "Write another report" : `Write today's report for ${c.preferred_name || c.full_name.split(" ")[0]}`}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent-h">
        <div className="flex items-baseline justify-between">
          <h2 id="recent-h" className="text-xl font-bold text-brand-900">
            Your recent reports
          </h2>
          <Link href="/portal/reports" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
            See all
          </Link>
        </div>
        {!recent?.length ? (
          <p className="mt-3 text-muted">Reports you send will appear here, so you can see when the office has read them.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-brand-100">
            {recent.map((r) => {
              const client = r.client as unknown as { full_name: string; preferred_name: string | null } | null;
              return (
                <li key={r.id}>
                  <Link href={`/portal/report/${r.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 hover:bg-brand-50">
                    <span>
                      <span className="block font-semibold text-brand-900">{client?.preferred_name || client?.full_name}</span>
                      <span className="block text-sm text-muted">
                        {formatVisitDate(r.visit_date)} · <Mood mood={r.mood} />
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <ReportStatus status={r.status} />
                      <ConcernBadge level={r.concern_level} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="rounded-2xl bg-white p-4 text-sm text-ink ring-1 ring-red-200">
        <strong className="text-red-800">Emergency?</strong> If someone is in danger, call <a href="tel:112" className="font-bold text-red-800 underline">112</a>{" "}
        first, then the office. Don&apos;t wait to write a report.
      </p>
    </div>
  );
}
