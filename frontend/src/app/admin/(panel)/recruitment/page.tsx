import Link from "next/link";
import { addApplicant, addFromEnquiry } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { ALL_CHECKS, CLOSED_STAGES, ROLES, STAGES } from "@/lib/recruitment";

export const metadata = { title: "Recruitment" };

export default async function RecruitmentPage({ searchParams }: { searchParams: Promise<{ role?: string; closed?: string }> }) {
  const { role, closed } = await searchParams;
  const staff = await requirePermission("workforce.view");
  let q = staff.supabase.from("recruitment_applicants").select("id, full_name, role_applied, location, stage, stage_changed_at, worker_id").order("stage_changed_at", { ascending: false }).limit(1000);
  if (role) q = q.eq("role_applied", role);
  const [{ data: applicants }, { data: checks }, { data: newApps }] = await Promise.all([
    q,
    staff.supabase.from("recruitment_checks").select("applicant_id, check_key, status"),
    staff.supabase
      .from("enquiries")
      .select("id, full_name, phone, email, created_at, payload")
      .eq("enquiry_type", "worker_application")
      .not("status", "in", "(closed,converted)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const done = (id: string) => (checks ?? []).filter((c) => c.applicant_id === id && (c.status === "passed" || c.status === "not_needed")).length;
  const { data: linked } = await staff.supabase.from("recruitment_applicants").select("enquiry_id").not("enquiry_id", "is", null);
  const linkedIds = new Set((linked ?? []).map((l) => l.enquiry_id));
  const waiting = (newApps ?? []).filter((e) => !linkedIds.has(e.id));
  const days = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400_000));
  const canCreate = staff.can("workforce.create");
  const closedList = (applicants ?? []).filter((a) => a.stage === "rejected" || a.stage === "withdrawn");

  return (
    <>
      <PageHeader
        title="Recruitment"
        intro="From application to placement. Nobody can be approved or placed until every check has passed: no placement without preparation."
        actions={
          canCreate ? (
            <a href="#add-applicant" className="inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Add an applicant
            </a>
          ) : null
        }
      />

      {waiting.length > 0 && (
        <section aria-labelledby="new-apps-h" className="mb-6 rounded-2xl border-2 border-accent-300 bg-accent-50 p-5">
          <h2 id="new-apps-h" className="font-bold text-brand-900">
            {waiting.length === 1 ? "1 new application" : `${waiting.length} new applications`} from the website
          </h2>
          <ul className="mt-3 divide-y divide-accent-200">
            {waiting.map((e) => {
              const p = (e.payload ?? {}) as Record<string, unknown>;
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <Link href={`/admin/enquiries/${e.id}`} className="font-semibold text-brand-800 underline">
                      {e.full_name}
                    </Link>
                    <span className="text-muted">
                      {" "}
                      · {typeof p.role === "string" ? p.role : "Role not given"} · {typeof p.location === "string" ? p.location : ""} · {formatDateTime(e.created_at)}
                    </span>
                  </span>
                  {canCreate && (
                    <ActionForm action={addFromEnquiry} submitLabel="Add to pipeline" inline>
                      <input type="hidden" name="enquiry_id" value={e.id} />
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <form action="/admin/recruitment" className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="role-filter" className="font-medium text-brand-900">
          Role
        </label>
        <select id="role-filter" name="role" defaultValue={role ?? ""} className="min-h-10 rounded-lg border border-gray-300 bg-white px-3">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="min-h-10 rounded-full bg-brand-800 px-4 font-semibold text-white">
          Show
        </button>
      </form>

      <div className="-mx-2 overflow-x-auto pb-2">
        <ol className="flex min-w-max gap-4 px-2" aria-label="Recruitment stages">
          {STAGES.map((s) => {
            const people = (applicants ?? []).filter((a) => a.stage === s.key);
            return (
              <li key={s.key} className="w-72 flex-none rounded-2xl bg-white p-3 ring-1 ring-gray-200">
                <h2 className="flex items-center justify-between px-1 font-semibold text-brand-900">
                  {s.label}
                  <span className="rounded-full bg-brand-100 px-2 text-sm text-brand-800">{people.length}</span>
                </h2>
                <p className="px-1 text-xs text-muted">{s.help}</p>
                <ul className="mt-3 space-y-2">
                  {people.map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/recruitment/${a.id}`} className="block rounded-xl border border-gray-200 p-3 text-sm hover:border-brand-400 hover:bg-brand-50">
                        <span className="block font-semibold text-brand-900">{a.full_name}</span>
                        <span className="block text-xs text-muted">{[a.role_applied, a.location].filter(Boolean).join(" · ") || "No details yet"}</span>
                        <span className="mt-2 flex items-center justify-between gap-2 text-xs">
                          <span className={done(a.id) === ALL_CHECKS.length ? "font-semibold text-green-800" : "text-muted"}>
                            {done(a.id)}/{ALL_CHECKS.length} checks
                          </span>
                          <span className={days(a.stage_changed_at) > 14 && ["registered", "screening", "training"].includes(a.stage) ? "font-semibold text-amber-800" : "text-muted"}>
                            {days(a.stage_changed_at) === 0 ? "today" : `${days(a.stage_changed_at)} d in stage`}
                          </span>
                        </span>
                        {a.worker_id && <span className="mt-1 block text-xs font-semibold text-green-800">✓ Portal account</span>}
                      </Link>
                    </li>
                  ))}
                  {!people.length && <li className="rounded-xl border border-dashed border-gray-200 p-3 text-center text-xs text-muted">Nobody here</li>}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>

      <details className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-gray-200" open={closed === "1"}>
        <summary className="cursor-pointer font-semibold text-brand-900">
          Not progressing ({closedList.length})
        </summary>
        <ul className="mt-2 space-y-1 text-sm">
          {closedList.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/recruitment/${a.id}`} className="font-semibold text-brand-700 underline">
                {a.full_name}
              </Link>{" "}
              <span className="text-muted">· {CLOSED_STAGES.find((c) => c.key === a.stage)?.label}</span>
            </li>
          ))}
          {!closedList.length && <li className="text-muted">None.</li>}
        </ul>
      </details>

      {canCreate && (
        <section id="add-applicant" className="mt-8 max-w-2xl scroll-mt-24">
          <Card title="Add an applicant">
            <p className="mb-3 text-sm text-muted">For someone who applied by phone or in person. Website applications appear at the top of this page.</p>
            <ActionForm action={addApplicant} submitLabel="Add applicant" inline>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-brand-900 sm:col-span-2">
                  Full name
                  <input name="full_name" required maxLength={120} className={adminInput} />
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Phone
                  <input name="phone" type="tel" maxLength={40} className={adminInput} />
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Email
                  <input name="email" type="email" className={adminInput} />
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Role
                  <select name="role_applied" defaultValue="" className={adminInput}>
                    <option value="">Choose…</option>
                    {ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Where they live
                  <input name="location" maxLength={200} className={adminInput} />
                </label>
              </div>
            </ActionForm>
          </Card>
        </section>
      )}
    </>
  );
}
