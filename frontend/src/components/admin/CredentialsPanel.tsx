import { addCredential, deleteCredential, reviewCredential } from "@/app/admin/(panel)/worker-documents/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, adminInput } from "@/components/admin/ui";
import { DOC_TYPES, compliance, docLabel, overall, stateText, type Credential, type DocState } from "@/lib/credentials";

export const STATE_STYLE: Record<DocState, string> = {
  valid: "bg-green-100 text-green-900",
  expiring: "bg-amber-100 text-amber-900",
  expired: "bg-red-100 text-red-900",
  missing: "bg-red-50 text-red-900 ring-1 ring-red-200",
  rejected: "bg-red-50 text-red-900 ring-1 ring-red-200",
  pending: "bg-blue-100 text-blue-900",
};
const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

/** A care worker's documents and checks: status per required type, checking renewed details, adding records. */
export function CredentialsPanel({ workerId, creds, skills, canEdit }: { workerId: string; creds: Credential[]; skills: string[]; canEdit: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = compliance(creds, skills, today);
  const sum = overall(rows);
  const ret = `/admin/care-workers/${workerId}`;
  return (
    <section id="checks" className="scroll-mt-24">
      <Card title="Documents & checks">
        <p className={`mb-4 inline-block rounded-full px-3 py-1 text-sm font-semibold ${sum.level === "ok" ? "bg-green-100 text-green-900" : sum.level === "attention" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-900"}`}>
          {sum.text}
        </p>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.type} className="rounded-xl border border-gray-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-brand-900">
                  {r.label}
                  {r.current?.doc_type === "passport" && r.type === "ghana_card" ? " (passport)" : ""}
                  {!r.required && <span className="ml-1 text-xs font-normal text-muted">(optional)</span>}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATE_STYLE[r.state]}`}>{stateText(r)}</span>
              </div>
              {r.current?.reference && <p className="mt-1 text-xs text-muted">No. {r.current.reference}</p>}
              {r.state === "rejected" && r.current?.note && <p className="mt-1 text-xs text-red-900">Reason: {r.current.note}</p>}
              {r.pending && (
                <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm">
                  <p className="font-semibold text-blue-950">
                    New details sent {fmt(r.pending.created_at.slice(0, 10))}: {r.pending.reference ? `no. ${r.pending.reference}, ` : ""}
                    expires {fmt(r.pending.expires_on)}
                  </p>
                  {r.pending.note && <p className="text-xs text-blue-950">“{r.pending.note}”</p>}
                  {canEdit && (
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <ActionForm action={reviewCredential} submitLabel="Checked: accept" inline>
                        <input type="hidden" name="id" value={r.pending.id} />
                        <input type="hidden" name="decision" value="verified" />
                        <input type="hidden" name="return_to" value={ret} />
                        <label className="block text-xs font-medium text-brand-900">
                          Expiry date (correct it if needed)
                          <input name="expires_on" type="date" defaultValue={r.pending.expires_on ?? ""} className={adminInput} />
                        </label>
                      </ActionForm>
                      <ActionForm action={reviewCredential} submitLabel="Not accepted" inline secondary>
                        <input type="hidden" name="id" value={r.pending.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <input type="hidden" name="return_to" value={ret} />
                        <label className="block text-xs font-medium text-brand-900">
                          Why (the care worker sees this)
                          <input name="note" maxLength={300} className={adminInput} />
                        </label>
                      </ActionForm>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <details className="mt-4 rounded-xl bg-brand-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-brand-800">Record a document you have seen</summary>
            <div className="mt-3">
              <ActionForm action={addCredential} submitLabel="Save document" inline>
                <input type="hidden" name="worker_id" value={workerId} />
                <input type="hidden" name="return_to" value={ret} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-brand-900">
                    Type
                    <select name="doc_type" required defaultValue="" className={adminInput}>
                      <option value="" disabled>
                        Choose…
                      </option>
                      {DOC_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    Name (for “Other”)
                    <input name="title" maxLength={120} className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    Number / reference
                    <input name="reference" maxLength={100} className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    Note
                    <input name="note" maxLength={300} className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    Issued on
                    <input name="issued_on" type="date" className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    Expires on (leave empty if it doesn&apos;t)
                    <input name="expires_on" type="date" className={adminInput} />
                  </label>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" name="verified" defaultChecked className="h-5 w-5 accent-brand-800" />
                    I have seen the original and it is genuine (checked)
                  </label>
                </div>
              </ActionForm>
            </div>
          </details>
        )}

        {creds.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-brand-800">All records ({creds.length})</summary>
            <ul className="mt-2 divide-y divide-gray-100 text-sm">
              {[...creds]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{docLabel(c.doc_type, c.title)}</span>
                      <span className="text-muted">
                        {" "}
                        · {c.status === "verified" ? "checked" : c.status === "pending" ? "waiting to be checked" : "not accepted"} · expires {fmt(c.expires_on)}
                        {c.reference ? ` · ${c.reference}` : ""}
                      </span>
                    </span>
                    {canEdit && (
                      <ActionForm action={deleteCredential} submitLabel="Remove" inline secondary confirm="Remove this record?">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="return_to" value={ret} />
                      </ActionForm>
                    )}
                  </li>
                ))}
            </ul>
          </details>
        )}
      </Card>
    </section>
  );
}
