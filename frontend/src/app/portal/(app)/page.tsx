import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { compliance, stateInline, type Credential } from "@/lib/credentials";
import Link from "next/link";
import { ConcernBadge, Mood, ReportStatus, VisitStatus, formatVisitDate, hhmm } from "@/components/portal/ReportBits";
import { todayInGhana } from "@/lib/care";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Today" };

type Plan = { about_me: string | null; visit_tasks: string[]; risks: string | null; medication_notes: string | null };

/** The client's care plan, folded away until the worker opens it. */
function CarePlanDetails({ plan, notes }: { plan?: Plan; notes: string | null }) {
  if (!plan && !notes) return null;
  return (
    <details className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm open:pb-4">
      <summary className="min-h-8 cursor-pointer font-semibold text-brand-800">
        Care plan{plan?.visit_tasks.length ? ` · ${plan.visit_tasks.length} tasks each visit` : ""}
      </summary>
      <div className="mt-2 space-y-3 text-ink">
        {plan?.about_me && <p>{plan.about_me}</p>}
        {plan?.visit_tasks.length ? (
          <div>
            <p className="font-semibold text-brand-900">Each visit</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {plan.visit_tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {plan?.risks && (
          <p className="rounded-lg bg-amber-50 p-2 text-amber-950">
            <strong>Take care: </strong>
            {plan.risks}
          </p>
        )}
        {plan?.medication_notes && (
          <p>
            <strong className="text-brand-900">Medication: </strong>
            {plan.medication_notes}
          </p>
        )}
        {notes && !plan && <p className="whitespace-pre-line">{notes}</p>}
      </div>
    </details>
  );
}

function greeting(now = new Date()) {
  const h = now.getUTCHours(); // Ghana is on UTC
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function PortalHome() {
  const worker = await requireWorker();
  const { data: myCreds } = await worker.supabase
    .from("worker_credentials")
    .select("id, doc_type, title, reference, issued_on, expires_on, status, note, created_at")
    .eq("worker_id", worker.user.id);
  const [{ data: news }, { data: toRead }] = await Promise.all([
    worker.supabase.from("portal_announcements").select("id, title, body, important, publish_at").order("publish_at", { ascending: false }).limit(5),
    worker.supabase.rpc("my_policies_to_read"),
  ]);
  const docRows = compliance((myCreds ?? []) as Credential[], [], new Date().toISOString().slice(0, 10)).filter(
    (r) => r.required && !r.pending && (r.state === "expired" || r.state === "expiring" || r.state === "rejected"),
  );
  const today = todayInGhana();
  const weekAhead = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const [{ data: clients }, { data: recent }, { data: todays }, { data: plans }, { data: shifts }] = await Promise.all([
    worker.supabase.from("care_clients").select("id, full_name, preferred_name, area, care_summary").order("full_name"),
    worker.supabase
      .from("care_reports")
      .select("id, reference, visit_date, mood, concern_level, status, office_note, client:care_clients(full_name, preferred_name)")
      .eq("worker_id", worker.user.id)
      .order("submitted_at", { ascending: false })
      .limit(5),
    worker.supabase.from("care_reports").select("client_id").eq("worker_id", worker.user.id).eq("visit_date", today),
    worker.supabase.from("care_plans").select("client_id, about_me, visit_tasks, risks, medication_notes"),
    worker.supabase
      .from("care_shift_status")
      .select("id, client_id, shift_date, start_time, end_time, notes, visit_status")
      .eq("worker_id", worker.user.id)
      .gte("shift_date", today)
      .lte("shift_date", weekAhead)
      .neq("visit_status", "cancelled")
      .order("shift_date")
      .order("start_time"),
  ]);
  const clientName = (id: string) => {
    const c = (clients ?? []).find((x) => x.id === id);
    return c ? c.preferred_name || c.full_name : "Client";
  };
  const visitsToday = (shifts ?? []).filter((v) => v.shift_date === today);
  const comingUp = (shifts ?? []).filter((v) => v.shift_date > today);
  const planFor = new Map((plans ?? []).map((p) => [p.client_id, p]));
  const reportedToday = new Set((todays ?? []).map((r) => r.client_id));
  const notes = (recent ?? []).filter((r) => r.office_note);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-brand-900">
          {greeting()}, {worker.firstName}
        </h1>
      {docRows.length > 0 && (
        <div role="note" className={`mt-4 rounded-2xl p-4 ring-1 ${docRows.some((r) => r.state !== "expiring") ? "bg-red-50 text-red-950 ring-red-300" : "bg-amber-50 text-amber-950 ring-amber-300"}`}>
          <p className="font-semibold">Please renew: {docRows.map((r) => `${r.label} (${stateInline(r)})`).join("; ")}</p>
          <Link href="/portal/documents" className="mt-1 inline-block text-sm font-semibold underline">
            Send the new details
          </Link>
        </div>
      )}
      {Number(toRead ?? 0) > 0 && (
        <div role="note" className="mt-4 rounded-2xl bg-accent-50 p-4 text-ink ring-1 ring-accent-300">
          <p className="font-semibold">{Number(toRead) === 1 ? "1 policy" : `${toRead} policies`} to read and confirm</p>
          <Link href="/portal/policies" className="mt-1 inline-block text-sm font-semibold underline">
            Read the policies
          </Link>
        </div>
      )}
        <p className="mt-1 text-muted">
          {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date())}
        </p>
      </section>

      <AnnouncementList items={news ?? []} />

      <section aria-labelledby="visits-h">
        <h2 id="visits-h" className="text-xl font-bold text-brand-900">
          Your visits today
        </h2>
        {!visitsToday.length ? (
          <p className="mt-2 text-muted">No visits booked for today.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {visitsToday.map((v) => (
              <li key={v.id!} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-brand-900">
                      {hhmm(v.start_time!)} – {hhmm(v.end_time!)}
                    </p>
                    <p className="text-ink">{clientName(v.client_id!)}</p>
                    {v.notes && <p className="text-sm text-muted">{v.notes}</p>}
                  </div>
                  <VisitStatus status={v.visit_status!} />
                </div>
                {v.visit_status !== "done" && (
                  <Link
                    href={`/portal/report/new?shift=${v.id}`}
                    className="mt-3 flex min-h-12 items-center justify-center rounded-full bg-accent-500 px-5 font-semibold text-brand-950 hover:bg-accent-400"
                  >
                    Write report for this visit
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {comingUp.length > 0 && (
          <details className="mt-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-brand-100">
            <summary className="min-h-8 cursor-pointer font-semibold text-brand-800">Coming up this week ({comingUp.length})</summary>
            <ul className="mt-2 divide-y divide-brand-100 text-sm">
              {comingUp.map((v) => (
                <li key={v.id!} className="flex justify-between gap-3 py-2">
                  <span>
                    <strong className="text-brand-900">{formatVisitDate(v.shift_date!)}</strong> · {hhmm(v.start_time!)}–{hhmm(v.end_time!)}
                  </span>
                  <span className="text-right text-ink">{clientName(v.client_id!)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
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
          Your clients
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
                  <CarePlanDetails plan={planFor.get(c.id)} notes={c.care_summary} />
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

      <section aria-labelledby="incident-h" className="rounded-2xl bg-white p-4 ring-1 ring-red-200">
        <h2 id="incident-h" className="font-bold text-red-800">
          Something went wrong?
        </h2>
        <p className="mt-1 text-sm text-ink">
          A fall, an injury, a medicine mistake or a worry about someone&apos;s safety. If someone is in danger, call{" "}
          <a href="tel:112" className="font-bold text-red-800 underline">
            112
          </a>{" "}
          first, then the office.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/portal/incident/new" className="inline-flex min-h-12 items-center rounded-full border-2 border-red-700 px-5 font-semibold text-red-800 hover:bg-red-50">
            <span aria-hidden="true" className="mr-2">
              ⚠
            </span>
            Report an incident
          </Link>
          <Link href="/portal/incidents" className="inline-flex min-h-12 items-center text-sm font-semibold text-brand-800 underline">
            My incident reports
          </Link>
        </div>
      </section>

      <section aria-labelledby="training-h" className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <h2 id="training-h" className="text-lg font-bold text-brand-900">
          Training & certificates
        </h2>
        <p className="mt-1 text-sm text-ink">Your ChaseCare Academy online courses, CPD hours and certificates.</p>
        <Link href="/learn" className="mt-3 inline-flex min-h-12 items-center rounded-full bg-brand-800 px-5 font-semibold text-white hover:bg-brand-700">
          My learning
        </Link>
      </section>

      <section aria-labelledby="avail-h" className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <h2 id="avail-h" className="text-lg font-bold text-brand-900">
          My availability
        </h2>
        <p className="mt-1 text-sm text-ink">The days and hours you can work, and your leave. The office books visits around them.</p>
        <Link href="/portal/availability" className="mt-3 inline-flex min-h-12 items-center rounded-full px-5 font-semibold text-brand-800 ring-2 ring-brand-800 hover:bg-brand-50">
          Update my availability
        </Link>
      </section>

      <section aria-labelledby="pol-h" className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <h2 id="pol-h" className="text-lg font-bold text-brand-900">
          Policies
        </h2>
        <p className="mt-1 text-sm text-ink">How we work at Chase Care: safeguarding, confidentiality and more.</p>
        <Link href="/portal/policies" className="mt-3 inline-flex min-h-12 items-center rounded-full px-5 font-semibold text-brand-800 ring-2 ring-brand-800 hover:bg-brand-50">
          Read the policies
        </Link>
      </section>

      <section aria-labelledby="docs-h" className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <h2 id="docs-h" className="text-lg font-bold text-brand-900">
          My documents
        </h2>
        <p className="mt-1 text-sm text-ink">Your ID, police check and certificates, and when they expire.</p>
        <Link href="/portal/documents" className="mt-3 inline-flex min-h-12 items-center rounded-full px-5 font-semibold text-brand-800 ring-2 ring-brand-800 hover:bg-brand-50">
          My documents
        </Link>
      </section>
    </div>
  );
}
