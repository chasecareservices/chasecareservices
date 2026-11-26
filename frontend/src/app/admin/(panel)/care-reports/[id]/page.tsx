import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewReport, setHomeFromReport } from "../actions";
import { VisitLocationPanel } from "@/components/admin/VisitLocation";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, adminInput, formatDateTime } from "@/components/admin/ui";
import { ConcernBadge, Mood, ReportStatus, formatVisitDate } from "@/components/portal/ReportBits";
import { requirePermission } from "@/lib/admin/session";
import { ACTIVITIES, MEALS, MEDICATION, labelOf, visitTimes } from "@/lib/care";
import { phoneDigits } from "@/lib/format";

export const metadata = { title: "Care report" };

export default async function CareReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const staff = await requirePermission("care_ops.view");
  const { data: r } = await staff.supabase
    .from("care_reports")
    .select(
      "*, client:care_clients(id, full_name, preferred_name, area, care_summary, emergency_contact_name, emergency_contact_phone, home_lat, home_lng), worker:profiles!care_reports_worker_id_fkey(full_name, phone)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const client = r.client as unknown as {
    id: string;
    full_name: string;
    preferred_name: string | null;
    area: string | null;
    care_summary: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    home_lat: number | null;
    home_lng: number | null;
  };
  const worker = r.worker as unknown as { full_name: string | null; phone: string | null } | null;

  const [{ data: history }, { data: reviewer }, { data: plan }] = await Promise.all([
    staff.supabase
      .from("care_reports")
      .select("id, reference, visit_date, mood, concern_level, status")
      .eq("client_id", client.id)
      .neq("id", r.id)
      .order("visit_date", { ascending: false })
      .limit(6),
    r.reviewed_by ? staff.supabase.from("profiles").select("full_name").eq("id", r.reviewed_by).maybeSingle() : Promise.resolve({ data: null }),
    staff.supabase.from("care_plans").select("visit_tasks").eq("client_id", client.id).maybeSingle(),
  ]);
  const planTasks = plan?.visit_tasks ?? [];
  const notDone = planTasks.filter((t) => !r.tasks_done.includes(t));

  return (
    <>
      {saved === "home" && <Notice>Home location saved. Future reports will be compared with it.</Notice>}
      {saved === "1" && <Notice>Marked as read. The care worker can now see that the office has read it{r.office_note ? ", along with your note" : ""}.</Notice>}
      <Link href="/admin/care-reports" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
        ← All care reports
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{r.reference}</p>
          <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{client.full_name}</h1>
          <p className="text-muted">
            Visit on {formatVisitDate(r.visit_date)}, {visitTimes(r.start_time, r.end_time)} · by {worker?.full_name ?? "care worker"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConcernBadge level={r.concern_level} />
          <ReportStatus status={r.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {r.concern_level !== "none" && (
            <section
              className={`rounded-2xl border-2 p-5 ${r.concern_level === "urgent" ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}
            >
              <h2 className="font-bold">
                <span aria-hidden="true">{r.concern_level === "urgent" ? "‼ " : "! "}</span>
                {r.concern_level === "urgent" ? "Urgent concern — act today" : "Keep an eye on this"}
              </h2>
              <p className="mt-2 whitespace-pre-line">{r.concerns}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {worker?.phone && (
                  <a href={`tel:${phoneDigits(worker.phone)}`} className="inline-flex min-h-10 items-center rounded-full bg-white px-4 font-semibold ring-1 ring-current">
                    Call {worker.full_name?.split(" ")[0] ?? "the care worker"}
                  </a>
                )}
                {client.emergency_contact_phone && (
                  <a href={`tel:${phoneDigits(client.emergency_contact_phone)}`} className="inline-flex min-h-10 items-center rounded-full bg-white px-4 font-semibold ring-1 ring-current">
                    Call {client.emergency_contact_name ?? "emergency contact"}
                  </a>
                )}
              </div>
            </section>
          )}

          <Card title="How the visit went">
            <p className="whitespace-pre-line text-lg leading-relaxed">{r.summary}</p>
          </Card>

          <Card title="Visit location">
            <VisitLocationPanel
              report={r}
              client={{ name: client.preferred_name || client.full_name, home_lat: client.home_lat, home_lng: client.home_lng }}
              canSetHome={staff.can("clients.edit")}
              setHomeAction={setHomeFromReport}
            />
          </Card>

          {planTasks.length > 0 && (
            <Card title={`Care plan tasks: ${planTasks.length - notDone.length} of ${planTasks.length} done`}>
              <ul className="space-y-1">
                {planTasks.map((t) => {
                  const done = r.tasks_done.includes(t);
                  return (
                    <li key={t} className={done ? "text-ink" : "font-semibold text-amber-900"}>
                      <span aria-hidden="true">{done ? "✓ " : "✗ "}</span>
                      <span className="sr-only">{done ? "Done: " : "Not done: "}</span>
                      {t}
                    </li>
                  );
                })}
              </ul>
              {notDone.length > 0 && <p className="mt-3 text-sm text-muted">Check the notes for why, or ask the care worker.</p>}
            </Card>
          )}

          <Card title="At a glance">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">Mood</dt>
                <dd className="text-lg">
                  <Mood mood={r.mood} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Activities</dt>
                <dd>{r.activities.length ? r.activities.map((a) => labelOf(ACTIVITIES, a)).join(", ") : "None ticked"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Food and drink</dt>
                <dd>{r.meals ? labelOf(MEALS, r.meals) : "Not answered"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Medication</dt>
                <dd className={r.medication === "refused" || r.medication === "missed" ? "font-semibold text-red-800" : ""}>
                  {r.medication ? labelOf(MEDICATION, r.medication) : "Not answered"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              Sent {formatDateTime(r.submitted_at)}
              {r.updated_at !== r.submitted_at && new Date(r.updated_at).getTime() - new Date(r.submitted_at).getTime() > 60_000
                ? ` · corrected by the care worker ${formatDateTime(r.updated_at)}`
                : ""}
            </p>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title={r.status === "reviewed" ? "Read by the office" : "Mark as read"}>
            {r.status === "reviewed" && (
              <p className="mb-3 text-sm text-muted">
                ✓ Read by {reviewer?.full_name ?? "the office"} on {formatDateTime(r.reviewed_at)}.
              </p>
            )}
            {staff.can("care_ops.edit") ? (
              <ActionForm action={reviewReport} submitLabel={r.status === "reviewed" ? "Update note" : "Mark as read"} inline>
                <input type="hidden" name="id" value={r.id} />
                <label className="block text-sm font-medium text-brand-900">
                  Note to the care worker (optional)
                  <textarea
                    name="office_note"
                    rows={4}
                    maxLength={2000}
                    defaultValue={r.office_note ?? ""}
                    placeholder="e.g. Thank you — we've called her son about the cough."
                    className={adminInput}
                  />
                </label>
                <p className="mt-2 text-xs text-muted">They see this note in their portal. Once read, they can no longer change the report.</p>
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">You can read reports but not mark them.</p>
            )}
          </Card>

          <Card title="About the client">
            <p className="font-semibold text-brand-900">
              {client.full_name}
              {client.preferred_name ? ` (“${client.preferred_name}”)` : ""}
            </p>
            {client.area && <p className="text-sm text-muted">📍 {client.area}</p>}
            {client.care_summary && <p className="mt-2 whitespace-pre-line text-sm">{client.care_summary}</p>}
            {client.emergency_contact_name && (
              <p className="mt-2 text-sm">
                Emergency contact: {client.emergency_contact_name}
                {client.emergency_contact_phone ? `, ${client.emergency_contact_phone}` : ""}
              </p>
            )}
            <Link href={`/admin/care-clients/${client.id}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline underline-offset-4">
              Client details
            </Link>
          </Card>

          <Card title="Earlier reports">
            {!history?.length ? (
              <p className="text-sm text-muted">This is the first report for this client.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id}>
                    <Link href={`/admin/care-reports/${h.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-50">
                      <span>
                        {formatVisitDate(h.visit_date)} · <Mood mood={h.mood} />
                      </span>
                      <span className="flex items-center gap-1">
                        <ConcernBadge level={h.concern_level} />
                        {h.status === "submitted" && <span className="rounded-full bg-accent-100 px-2 text-xs font-bold text-accent-700">New</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/admin/care-reports?view=all&client=${client.id}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline underline-offset-4">
              All reports for {client.preferred_name || client.full_name.split(" ")[0]}
            </Link>
          </Card>
        </aside>
      </div>
    </>
  );
}
