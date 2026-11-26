import Link from "next/link";
import { notFound } from "next/navigation";
import { ConcernBadge, Mood, ReportStatus, formatVisitDate } from "@/components/portal/ReportBits";
import { ACTIVITIES, LOCATION_PROBLEMS, MEALS, MEDICATION, labelOf, visitTimes } from "@/lib/care";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Report" };

export default async function PortalReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; updated?: string }>;
}) {
  const [{ id }, { sent, updated }] = await Promise.all([params, searchParams]);
  const worker = await requireWorker();
  const { data: r } = await worker.supabase
    .from("care_reports")
    .select("*, client:care_clients(full_name, preferred_name)")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const client = r.client as unknown as { full_name: string; preferred_name: string | null } | null;
  const name = client?.preferred_name || client?.full_name || "your client";
  const sentAt = new Date(r.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      {(sent || updated) && (
        <section role="status" className="rounded-3xl bg-green-700 p-6 text-white">
          <p aria-hidden="true" className="text-4xl">
            ✓
          </p>
          <h1 className="mt-2 text-2xl font-bold">{sent ? "Report sent" : "Changes saved"}</h1>
          <p className="mt-1 text-green-50">
            {sent
              ? `The office has your report on ${name}. Reference ${r.reference}, sent at ${sentAt}.`
              : `Your report ${r.reference} has been updated.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/portal" className="inline-flex min-h-12 items-center rounded-full bg-white px-5 font-semibold text-green-800">
              Back to today
            </Link>
            <Link href="/portal/report/new" className="inline-flex min-h-12 items-center rounded-full border-2 border-white px-5 font-semibold text-white">
              Write another report
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-muted">{r.reference}</p>
          <ReportStatus status={r.status} />
        </div>
        <h2 className="mt-2 text-2xl font-bold text-brand-900">{name}</h2>
        <p className="text-muted">
          {formatVisitDate(r.visit_date)} · {visitTimes(r.start_time, r.end_time)}
        </p>
        {r.location_status !== "not_recorded" && (
          <p className="mt-1 text-sm text-muted">
            <span aria-hidden="true">📍 </span>
            {r.location_status === "captured"
              ? `Location recorded${r.location_accuracy_m != null ? ` (about ${Math.round(r.location_accuracy_m)} m)` : ""}`
              : `No location: ${LOCATION_PROBLEMS[r.location_status as keyof typeof LOCATION_PROBLEMS]?.toLowerCase() ?? "not recorded"}`}
          </p>
        )}

        {r.office_note && (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-green-900">
            <p className="text-sm font-bold">💬 Note from the office</p>
            <p className="mt-1">{r.office_note}</p>
          </div>
        )}

        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm text-muted">Mood</dt>
            <dd className="text-lg">
              <Mood mood={r.mood} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">What you did</dt>
            <dd>{r.activities.length ? r.activities.map((a) => labelOf(ACTIVITIES, a)).join(", ") : "None ticked"}</dd>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-sm text-muted">Food and drink</dt>
              <dd>{r.meals ? labelOf(MEALS, r.meals) : "Not answered"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Medication</dt>
              <dd>{r.medication ? labelOf(MEDICATION, r.medication) : "Not answered"}</dd>
            </div>
          </div>
          <div>
            <dt className="text-sm text-muted">How the visit went</dt>
            <dd className="whitespace-pre-line">{r.summary}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Concerns</dt>
            <dd>
              {r.concern_level === "none" ? (
                "No concerns"
              ) : (
                <>
                  <ConcernBadge level={r.concern_level} />
                  <p className="mt-1 whitespace-pre-line">{r.concerns}</p>
                </>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {r.status === "submitted" ? (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
          <p className="text-muted">Spotted a mistake? You can correct this report until the office reads it.</p>
          <Link
            href={`/portal/report/${r.id}/edit`}
            className="mt-3 inline-flex min-h-12 items-center rounded-full border-2 border-brand-800 px-5 font-semibold text-brand-800 hover:bg-brand-50"
          >
            Correct this report
          </Link>
        </div>
      ) : (
        <p className="text-muted">The office has read this report, so it can no longer be changed. Call the office if something needs correcting.</p>
      )}
    </div>
  );
}
