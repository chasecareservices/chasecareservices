import Link from "next/link";
import { issueCertificate, revokeCertificate } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { CERT_TYPE_LABEL } from "@/lib/learning";

export const metadata = { title: "Certificates" };

export default async function CertificatesAdmin({ searchParams }: { searchParams: Promise<{ q?: string; issued?: string; saved?: string }> }) {
  const { q, issued, saved } = await searchParams;
  const staff = await requirePermission("academy.view");
  const sb = staff.supabase;
  let query = sb.from("certificates").select("id, number, verify_code, learner_name, course_title, certification_type, cpd_hours, completed_on, issued_by, revoked_at, revoked_reason").order("issued_at", { ascending: false }).limit(200);
  const term = (q ?? "").trim().slice(0, 80).replace(/[%,()]/g, "");
  if (term) query = query.or(`learner_name.ilike.%${term}%,number.ilike.%${term}%,course_title.ilike.%${term}%,verify_code.ilike.%${term}%`);
  const [{ data: certs }, { data: courses }] = await Promise.all([query, sb.from("courses").select("id, title").order("title")]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/learning" className="text-sm font-medium text-brand-700 underline">
          ← Online learning
        </Link>
      </p>
      {issued && <Notice>Certificate {issued} issued. Download it from the list below.</Notice>}
      {saved && <Notice>{saved === "revoked" ? "Certificate revoked. The check page now shows it as revoked." : "Certificate restored."}</Notice>}
      <PageHeader
        title="Certificates"
        intro="Every ChaseCare Academy certificate. Online courses issue them automatically; issue one here for in-person courses. Anyone can check a certificate at /certificates/verify."
      />

      {staff.can("academy.create") && (
        <Card title="Issue a certificate (in-person course)" className="mb-8 max-w-3xl">
          <ActionForm action={issueCertificate} submitLabel="Issue certificate" inline>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-medium text-brand-900 sm:col-span-3">
                Learner&apos;s full name (as it should appear)
                <input name="learner_name" required maxLength={120} className={adminInput} />
              </label>
              <label className="text-sm font-medium text-brand-900 sm:col-span-2">
                Course
                <select name="course_id" required defaultValue="" className={adminInput}>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {(courses ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-brand-900">
                Completed on
                <input name="completed_on" type="date" required max={today} defaultValue={today} className={adminInput} />
              </label>
            </div>
          </ActionForm>
        </Card>
      )}

      <form action="/admin/learning/certificates" className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="cert-q" className="font-medium text-brand-900">
          Search
        </label>
        <input id="cert-q" name="q" defaultValue={term} placeholder="Name, number or course" className="min-h-10 w-64 rounded-lg border border-gray-300 bg-white px-3" />
        <button type="submit" className="min-h-10 rounded-full bg-brand-800 px-4 font-semibold text-white">
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Certificate</th>
              <th scope="col" className="px-4 py-3">Learner</th>
              <th scope="col" className="px-4 py-3">Course</th>
              <th scope="col" className="px-4 py-3">Completed</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(certs ?? []).map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-4 py-3">
                  <a href={`/learn/certificates/${c.number}`} className="font-semibold text-brand-800 underline">
                    {c.number}
                  </a>
                  <span className="block text-xs text-muted">Code {c.verify_code}</span>
                </td>
                <td className="px-4 py-3 font-semibold">{c.learner_name}</td>
                <td className="px-4 py-3">
                  {c.course_title}
                  <span className="block text-xs text-muted">
                    {CERT_TYPE_LABEL[c.certification_type]}
                    {c.cpd_hours ? ` · ${c.cpd_hours} CPD h` : ""} · {c.issued_by ? "issued by staff" : "online"}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(`${c.completed_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</td>
                <td className="px-4 py-3">
                  {c.revoked_at ? (
                    <>
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">Revoked</span>
                      <span className="mt-1 block text-xs text-muted">{c.revoked_reason}</span>
                      {staff.can("academy.edit") && (
                        <div className="mt-2">
                          <ActionForm action={revokeCertificate} submitLabel="Restore" inline secondary>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="undo" value="1" />
                          </ActionForm>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">Valid</span>
                      {staff.can("academy.edit") && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-red-800">Revoke…</summary>
                          <div className="mt-2 w-64">
                            <ActionForm action={revokeCertificate} submitLabel="Revoke certificate" inline secondary confirm="Revoke this certificate? The check page will show it as not valid.">
                              <input type="hidden" name="id" value={c.id} />
                              <label className="text-xs font-medium text-brand-900">
                                Reason
                                <input name="reason" required maxLength={300} className={adminInput} />
                              </label>
                            </ActionForm>
                          </div>
                        </details>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!certs?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No certificates{term ? " match your search" : " yet"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
