import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, inviteApplicant, moveStage, saveApplicant, saveChecks } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { ALL_CHECKS, CHECK_GROUPS, CHECK_STATUS, CLOSED_STAGES, LOCKED_STAGES, ROLES, STAGES, checkLabel, missingChecks, stageLabel } from "@/lib/recruitment";
import { whatsappLink } from "@/lib/format";

export const metadata = { title: "Applicant" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

const SAVED: Record<string, string> = {
  added: "Added to the recruitment pipeline.",
  stage: "Stage updated.",
  checks: "Checklist saved.",
  note: "Note added.",
  details: "Details saved.",
  invited: "Invitation sent. They'll get an email to set their password and open the care worker portal.",
};

const STATUS_TONE: Record<string, string> = {
  passed: "bg-green-100 text-green-900",
  failed: "bg-red-100 text-red-900",
  not_needed: "bg-gray-100 text-gray-800",
  pending: "bg-amber-50 text-amber-900",
};

export default async function ApplicantPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;
  const staff = await requirePermission("workforce.view");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [{ data: a }, { data: checks }, { data: notes }] = await Promise.all([
    staff.supabase.from("recruitment_applicants").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("recruitment_checks").select("check_key, status, note, checked_by, checked_at").eq("applicant_id", id),
    staff.supabase.from("recruitment_notes").select("id, body, created_at, author_id").eq("applicant_id", id).order("created_at"),
  ]);
  if (!a) notFound();

  const peopleIds = [...new Set([...(notes ?? []).map((n) => n.author_id), ...(checks ?? []).map((c) => c.checked_by)].filter(Boolean))] as string[];
  const { data: people } = peopleIds.length ? await staff.supabase.from("profiles").select("id, full_name").in("id", peopleIds) : { data: [] };
  const nameOf = (pid: string | null) => people?.find((p) => p.id === pid)?.full_name ?? "Staff member";

  const byKey = new Map((checks ?? []).map((c) => [c.check_key, c]));
  const statuses = Object.fromEntries((checks ?? []).map((c) => [c.check_key, c.status]));
  const missing = missingChecks(statuses);
  const failed = (checks ?? []).filter((c) => c.status === "failed");
  const canEdit = staff.can("workforce.edit");
  const stageIndex = STAGES.findIndex((s) => s.key === a.stage);
  const isClosed = stageIndex === -1;
  const next = !isClosed ? STAGES[stageIndex + 1] : undefined;
  const ready = missing.length === 0;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/recruitment" className="text-sm font-medium text-brand-700 underline">
          ← Recruitment
        </Link>
      </p>
      {saved && SAVED[saved] && <Notice>{SAVED[saved]}</Notice>}
      <PageHeader
        title={a.full_name}
        intro={`${[a.role_applied, a.location].filter(Boolean).join(" · ") || "Applicant"} · in ${stageLabel(a.stage)} since ${formatDateTime(a.stage_changed_at)}`}
      />

      {/* Stage stepper */}
      <nav aria-label="Recruitment stage" className="mb-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 text-sm">
          {STAGES.map((s, i) => {
            const current = s.key === a.stage;
            const done = !isClosed && i < stageIndex;
            return (
              <li
                key={s.key}
                aria-current={current ? "step" : undefined}
                className={`rounded-full px-4 py-2 font-semibold ${current ? "bg-brand-800 text-white" : done ? "bg-brand-100 text-brand-900" : "bg-white text-muted ring-1 ring-gray-200"}`}
              >
                {done ? "✓ " : ""}
                {s.label}
                {LOCKED_STAGES.has(s.key) && !ready && !done && !current ? " 🔒" : ""}
              </li>
            );
          })}
          {isClosed && <li className="rounded-full bg-gray-700 px-4 py-2 font-semibold text-white">{stageLabel(a.stage)}</li>}
        </ol>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {canEdit && (
            <Card title="Move to the next stage">
              {next ? (
                <>
                  <p className="text-sm text-muted">{next.help}</p>
                  {LOCKED_STAGES.has(next.key) && !ready ? (
                    <div className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
                      <p className="font-semibold text-amber-950">No placement without preparation. Still to pass:</p>
                      <ul className="mt-1 list-disc pl-5 text-amber-950">
                        {missing.map((k) => (
                          <li key={k}>{checkLabel(k)}</li>
                        ))}
                      </ul>
                      <p className="mt-2">
                        <a href="#checklist" className="font-semibold text-brand-800 underline">
                          Go to the checklist
                        </a>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <ActionForm action={moveStage} submitLabel={`Move to ${next.label}`} inline>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="stage" value={next.key} />
                      </ActionForm>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">{isClosed ? "This application is closed." : "This is the last stage."}</p>
              )}
              {failed.length > 0 && !isClosed && (
                <p className="mt-3 text-sm text-red-900">
                  Didn&apos;t pass: {failed.map((c) => checkLabel(c.check_key)).join(", ")}. Re-check, or close the application below.
                </p>
              )}
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-semibold text-brand-800">Move to another stage</summary>
                <div className="mt-3">
                  <ActionForm action={moveStage} submitLabel="Change stage" inline secondary>
                    <input type="hidden" name="id" value={a.id} />
                    <label htmlFor="stage-any" className="sr-only">
                      Stage
                    </label>
                    <select id="stage-any" name="stage" defaultValue={a.stage} className={adminInput}>
                      {[...STAGES, ...CLOSED_STAGES].map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                          {LOCKED_STAGES.has(s.key) && !ready ? " (needs every check)" : ""}
                        </option>
                      ))}
                    </select>
                  </ActionForm>
                </div>
              </details>
            </Card>
          )}

          <section id="checklist" className="scroll-mt-24">
            <Card title={`Checklist: ${missing.length === 0 ? "complete ✓" : `${missing.length} still to pass`}`}>
              {canEdit ? (
                <ActionForm action={saveChecks} submitLabel="Save checklist">
                  <input type="hidden" name="id" value={a.id} />
                  {CHECK_GROUPS.map((g) => (
                    <fieldset key={g.title} className="mb-5">
                      <legend className="mb-2 font-semibold text-brand-900">{g.title}</legend>
                      <div className="space-y-3">
                        {g.checks.map((c) => {
                          const row = byKey.get(c.key);
                          const optional = "optional" in c && c.optional;
                          return (
                            <div key={c.key} className="grid gap-2 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1fr_10rem]">
                              <div>
                                <label htmlFor={`status_${c.key}`} className="font-medium text-brand-900">
                                  {c.label}
                                </label>
                                {"hint" in c && c.hint && <p className="text-xs text-muted">{c.hint}</p>}
                                {row?.checked_at && row.status !== "pending" && (
                                  <p className="text-xs text-muted">
                                    {nameOf(row.checked_by)} · {formatDateTime(row.checked_at)}
                                  </p>
                                )}
                              </div>
                              <select id={`status_${c.key}`} name={`status_${c.key}`} defaultValue={row?.status ?? "pending"} className={`${adminInput} ${STATUS_TONE[row?.status ?? "pending"]}`}>
                                {CHECK_STATUS.filter((s) => s.value !== "not_needed" || optional).map((s) => (
                                  <option key={s.value} value={s.value}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              <label className="text-xs text-muted sm:col-span-2">
                                Note (optional)
                                <input name={`note_${c.key}`} defaultValue={row?.note ?? ""} maxLength={1000} className={adminInput} />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </ActionForm>
              ) : (
                <ul className="space-y-1 text-sm">
                  {ALL_CHECKS.map((c) => (
                    <li key={c.key}>
                      {c.label}: <strong>{CHECK_STATUS.find((s) => s.value === (byKey.get(c.key)?.status ?? "pending"))?.label}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section id="notes" className="scroll-mt-24">
            <Card title="Notes">
              <ul className="space-y-3">
                {(notes ?? []).map((n) => (
                  <li key={n.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {nameOf(n.author_id)} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
                {!notes?.length && <li className="text-sm text-muted">No notes yet.</li>}
              </ul>
              {canEdit && (
                <div className="mt-4">
                  <ActionForm action={addNote} submitLabel="Add note" inline>
                    <input type="hidden" name="id" value={a.id} />
                    <label htmlFor="note-body" className="text-sm font-medium text-brand-900">
                      New note
                    </label>
                    <textarea id="note-body" name="body" rows={3} required maxLength={4000} className={adminInput} />
                  </ActionForm>
                </div>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card title="Care worker account">
            {a.worker_id ? (
              <p className="text-sm">
                ✓ They have a portal account.{" "}
                <Link href={`/admin/care-workers/${a.worker_id}`} className="font-semibold text-brand-700 underline">
                  Open their care worker page
                </Link>
              </p>
            ) : LOCKED_STAGES.has(a.stage) ? (
              canEdit ? (
                <>
                  <p className="mb-3 text-sm text-muted">Send them an invitation to the care worker portal so they can see their visits and write reports.</p>
                  {a.email ? (
                    <ActionForm action={inviteApplicant} submitLabel="Invite to the care worker portal" inline>
                      <input type="hidden" name="id" value={a.id} />
                    </ActionForm>
                  ) : (
                    <p className="text-sm text-amber-900">Add their email address below first.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">Not invited yet.</p>
              )
            ) : (
              <p className="text-sm text-muted">Once every check has passed and they are Approved, you can invite them to the care worker portal here.</p>
            )}
          </Card>

          <Card title="Contact">
            <ul className="space-y-1 text-sm">
              {a.phone && (
                <li>
                  <a href={`tel:${a.phone}`} className="font-semibold text-brand-700 underline">
                    {a.phone}
                  </a>
                  {" · "}
                  <a href={whatsappLink(a.phone)} className="text-brand-700 underline" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              )}
              {a.email && (
                <li>
                  <a href={`mailto:${a.email}`} className="text-brand-700 underline">
                    {a.email}
                  </a>
                </li>
              )}
              {a.enquiry_id && (
                <li>
                  <Link href={`/admin/enquiries/${a.enquiry_id}`} className="text-brand-700 underline">
                    Their original application
                  </Link>
                </li>
              )}
            </ul>
          </Card>

          <Card title="Details">
            {canEdit ? (
              <ActionForm action={saveApplicant} submitLabel="Save details">
                <input type="hidden" name="id" value={a.id} />
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-brand-900">
                    Full name
                    <input name="full_name" required defaultValue={a.full_name} maxLength={120} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Phone
                    <input name="phone" type="tel" defaultValue={a.phone ?? ""} maxLength={40} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Email
                    <input name="email" type="email" defaultValue={a.email ?? ""} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Role
                    <select name="role_applied" defaultValue={a.role_applied ?? ""} className={adminInput}>
                      <option value="">Choose…</option>
                      {[...new Set([...ROLES, ...(a.role_applied ? [a.role_applied] : [])])].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Where they live / can travel
                    <input name="location" defaultValue={a.location ?? ""} maxLength={200} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Availability
                    <input name="availability" defaultValue={a.availability ?? ""} maxLength={200} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Experience & qualifications
                    <textarea name="experience" rows={6} defaultValue={a.experience ?? ""} maxLength={4000} className={adminInput} />
                  </label>
                </div>
              </ActionForm>
            ) : (
              <dl className="space-y-2 text-sm">
                {[
                  ["Availability", a.availability],
                  ["Experience", a.experience],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-semibold text-brand-900">{k}</dt>
                    <dd className="whitespace-pre-wrap">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
