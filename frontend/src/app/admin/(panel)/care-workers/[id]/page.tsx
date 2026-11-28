import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addWorkerTimeOff, removeWorkerTimeOff, saveWorkerAvailability, saveWorkerProfile } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { AvailabilityFields } from "@/components/availability/AvailabilityFields";
import { GenderSelect, LanguageChecks, SkillChecks } from "@/components/availability/MatchingFields";
import { SKILLS, TIME_OFF_KINDS, WEEKDAYS, workerSkills } from "@/lib/matching";
import { ConcernBadge, Mood, ReportStatus, VisitStatus, formatVisitDate, hhmm } from "@/components/portal/ReportBits";
import { IncidentStatus, SeverityBadge } from "@/components/care/IncidentBits";
import { DocumentsPanel } from "@/components/admin/DocumentsPanel";
import { CredentialsPanel } from "@/components/admin/CredentialsPanel";
import type { Credential } from "@/lib/credentials";
import { requireStaff } from "@/lib/admin/session";
import { phoneDigits, whatsappLink } from "@/lib/format";
import { formatIncidentTime, kindLabel } from "@/lib/incidents";

export const metadata = { title: "Care worker" };

const SAVED: Record<string, string> = {
  profile: "Matching profile saved.",
  availability: "Availability saved.",
  timeoff: "Time off added.",
  "timeoff-removed": "Time off removed.",
  "doc-added": "Document recorded.",
  "doc-removed": "Record removed.",
  verified: "Accepted. The new expiry date is used for reminders.",
  rejected: "Marked as not accepted. The care worker sees the reason in their portal.",
};

export default async function CareWorkerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
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
  const canDocs = staff.can("workforce.view") || staff.can("care_ops.view");
  const { data: creds } = canDocs
    ? await staff.supabase.from("worker_credentials").select("id, doc_type, title, reference, issued_on, expires_on, status, note, created_at").eq("worker_id", id)
    : { data: [] };
  const [{ data: profile }, { data: availability }, { data: timeOff }, { data: certs }] = await Promise.all([
    staff.supabase.from("worker_profiles").select("*").eq("worker_id", id).maybeSingle(),
    staff.supabase.from("worker_availability").select("weekday, start_time, end_time").eq("worker_id", id).order("weekday"),
    staff.supabase.from("worker_time_off").select("id, starts_on, ends_on, kind, note").eq("worker_id", id).gte("ends_on", today).order("starts_on"),
    staff.supabase.rpc("care_worker_certificates"),
  ]);
  const myCerts = (certs ?? []).filter((c) => c.worker_id === id);
  const skillsShown = workerSkills(profile?.skills ?? [], myCerts.map((c) => c.course_title));
  const canEditProfile = staff.can("care_ops.edit") || staff.can("workforce.edit");
  const canEditAvailability = staff.can("care_ops.edit");
  const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  const clients = (team ?? []).map((t) => t.client as unknown as { id: string; full_name: string; area: string | null; is_active: boolean }).filter(Boolean);
  const clientName = new Map(clients.map((c) => [c.id, c.full_name]));
  const missed = (visits ?? []).filter((v) => v.visit_status === "missed").length;
  const upcoming = (visits ?? []).filter((v) => v.shift_date! >= today && v.visit_status !== "cancelled" && v.visit_status !== "done");

  return (
    <>
      <Link href="/admin/care-workers" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
        ← Care workers
      </Link>
      {saved && SAVED[saved] && (
        <div className="mt-3">
          <Notice>{SAVED[saved]}</Notice>
        </div>
      )}
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

          {canDocs && <CredentialsPanel workerId={id} creds={(creds ?? []) as Credential[]} skills={profile?.skills ?? []} canEdit={staff.can("workforce.edit")} />}
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
          <section id="matching" className="scroll-mt-24">
            <Card title="Matching profile">
              <p className="mb-3 text-sm">
                <span className="font-semibold text-brand-900">Skills: </span>
                {skillsShown.all.size
                  ? [...skillsShown.all]
                      .map((k) => `${SKILLS.find((s) => s.value === k)?.label ?? k}${skillsShown.certified.has(k) ? " (certificate)" : ""}`)
                      .join(", ")
                  : "none recorded"}
              </p>
              {myCerts.length > 0 && <p className="mb-3 text-xs text-muted">Academy certificates: {myCerts.map((c) => c.course_title).join(", ")}</p>}
              {canEditProfile ? (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-brand-800">Edit matching profile</summary>
                  <div className="mt-3">
                    <ActionForm action={saveWorkerProfile} submitLabel="Save profile" inline>
                      <input type="hidden" name="worker_id" value={id} />
                      <div className="space-y-4">
                        <SkillChecks name="skills" selected={profile?.skills ?? []} legend="Skills and experience (Academy certificates count automatically)" />
                        <LanguageChecks selected={profile?.languages ?? []} legend="Languages they speak" />
                        <GenderSelect name="gender" value={profile?.gender ?? null} label="Gender (for clients who ask for a female or male carer)" emptyLabel="Not recorded" />
                        <label className="block text-sm font-medium text-brand-900">
                          Where they live
                          <input name="home_area" maxLength={200} defaultValue={profile?.home_area ?? ""} placeholder="e.g. Madina, Accra" className={adminInput} />
                        </label>
                        <label className="block text-sm font-medium text-brand-900">
                          Home on the map (for distances)
                          <input
                            name="home_location"
                            maxLength={2000}
                            defaultValue={profile?.home_lat != null ? `${profile.home_lat}, ${profile.home_lng}` : ""}
                            placeholder="Google Maps link, or 5.6037, -0.1870"
                            className={adminInput}
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-sm font-medium text-brand-900">
                            Travels up to (km)
                            <input name="travel_km" type="number" min={1} max={500} defaultValue={profile?.travel_km ?? 15} className={adminInput} />
                          </label>
                          <label className="text-sm font-medium text-brand-900">
                            Max hours a week
                            <input name="max_hours_week" type="number" min={1} max={84} defaultValue={profile?.max_hours_week ?? ""} className={adminInput} />
                          </label>
                        </div>
                        <label className="block text-sm font-medium text-brand-900">
                          Notes for matching
                          <input name="notes" maxLength={500} defaultValue={profile?.notes ?? ""} className={adminInput} />
                        </label>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              ) : null}
            </Card>
          </section>

          <section id="availability" className="scroll-mt-24">
            <Card title="Availability">
              {availability?.length ? (
                <ul className="mb-3 space-y-1 text-sm">
                  {availability.map((a, i) => (
                    <li key={i}>
                      <span className="inline-block w-24 font-semibold">{WEEKDAYS[a.weekday - 1]}</span>
                      {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-muted">Not set yet. They can set it in their portal (My availability), or you can set it here.</p>
              )}
              {timeOff?.length ? (
                <ul className="mb-3 space-y-2 text-sm">
                  {timeOff.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <span>
                        <span className="font-semibold">
                          Off {fmtDay(t.starts_on)}
                          {t.ends_on !== t.starts_on ? ` – ${fmtDay(t.ends_on)}` : ""}
                        </span>{" "}
                        · {TIME_OFF_KINDS.find((k) => k.value === t.kind)?.label}
                        {t.note ? ` · ${t.note}` : ""}
                      </span>
                      {canEditAvailability && (
                        <ActionForm action={removeWorkerTimeOff} submitLabel="Remove" inline secondary confirm="Remove this time off?">
                          <input type="hidden" name="worker_id" value={id} />
                          <input type="hidden" name="id" value={t.id} />
                        </ActionForm>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canEditAvailability && (
                <>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-800">Change their usual week</summary>
                    <div className="mt-3">
                      <ActionForm action={saveWorkerAvailability} submitLabel="Save availability" inline>
                        <input type="hidden" name="worker_id" value={id} />
                        <AvailabilityFields rows={availability ?? []} compact />
                      </ActionForm>
                    </div>
                  </details>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-800">Add time off</summary>
                    <div className="mt-3">
                      <ActionForm action={addWorkerTimeOff} submitLabel="Add time off" inline>
                        <input type="hidden" name="worker_id" value={id} />
                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-sm font-medium text-brand-900">
                            First day
                            <input name="starts_on" type="date" required className={adminInput} />
                          </label>
                          <label className="text-sm font-medium text-brand-900">
                            Last day
                            <input name="ends_on" type="date" className={adminInput} />
                          </label>
                          <label className="text-sm font-medium text-brand-900">
                            Reason
                            <select name="kind" defaultValue="leave" className={adminInput}>
                              {TIME_OFF_KINDS.map((k) => (
                                <option key={k.value} value={k.value}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-brand-900">
                            Note
                            <input name="note" maxLength={200} className={adminInput} />
                          </label>
                        </div>
                      </ActionForm>
                    </div>
                  </details>
                </>
              )}
            </Card>
          </section>

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
