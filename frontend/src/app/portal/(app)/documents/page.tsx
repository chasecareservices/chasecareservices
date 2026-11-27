import Link from "next/link";
import { sendRenewal } from "@/app/portal/credential-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DOC_TYPES, compliance, overall, stateText, type Credential, type DocState } from "@/lib/credentials";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "My documents" };

const TONE: Record<DocState, string> = {
  valid: "bg-green-50 text-green-900 ring-green-200",
  expiring: "bg-amber-50 text-amber-950 ring-amber-300",
  expired: "bg-red-50 text-red-950 ring-red-300",
  missing: "bg-red-50 text-red-950 ring-red-200",
  rejected: "bg-red-50 text-red-950 ring-red-200",
  pending: "bg-blue-50 text-blue-950 ring-blue-200",
};
const input = "mt-1 block min-h-11 w-full rounded-lg border border-brand-200 bg-white px-2 text-base";

export default async function MyDocuments({ searchParams }: { searchParams: Promise<{ sent?: string; type?: string }> }) {
  const { sent, type } = await searchParams;
  const worker = await requireWorker();
  const [{ data: creds }, { data: profile }] = await Promise.all([
    worker.supabase.from("worker_credentials").select("id, doc_type, title, reference, issued_on, expires_on, status, note, created_at").eq("worker_id", worker.user.id),
    worker.supabase.from("worker_profiles").select("skills").eq("worker_id", worker.user.id).maybeSingle(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const rows = compliance((creds ?? []) as Credential[], profile?.skills ?? [], today);
  const sum = overall(rows);

  return (
    <div className="space-y-8">
      <p>
        <Link href="/portal" className="text-sm font-semibold text-brand-700 underline">
          ← Today
        </Link>
      </p>
      {sent && (
        <p role="status" className="rounded-2xl bg-green-50 p-4 font-semibold text-green-950 ring-1 ring-green-200">
          Thank you. The office will check it. If you haven&apos;t already, add a photo or PDF below, or bring the original to the office.
        </p>
      )}
      <div>
        <h1 className="text-3xl font-bold text-brand-900">My documents</h1>
        <p className="mt-1 text-muted">Your ID, police check and certificates. Keep them up to date so you can keep being booked for visits.</p>
        <p className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${sum.level === "ok" ? "bg-green-100 text-green-900" : sum.level === "attention" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-900"}`}>
          {sum.level === "ok" ? "All in order ✓" : sum.level === "attention" ? "Something needs renewing soon" : "Something needs your attention"}
        </p>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.type} className={`rounded-2xl p-4 ring-1 ${TONE[r.state]}`}>
            <p className="font-semibold">{r.label}</p>
            <p className="text-sm">{r.pending && r.state !== "pending" ? `${stateText(r)} · new details sent, waiting to be checked` : stateText(r)}</p>
            {r.state === "rejected" && r.current?.note && <p className="text-sm">Office: {r.current.note}</p>}
            {(r.state === "expired" || r.state === "expiring" || r.state === "missing" || r.state === "rejected") && !r.pending && (
              <a href={`/portal/documents?type=${r.type}#renew`} className="mt-1 inline-block text-sm font-semibold underline">
                Send the new details
              </a>
            )}
          </li>
        ))}
      </ul>

      <section id="renew" aria-labelledby="renew-h" className="scroll-mt-24">
        <h2 id="renew-h" className="text-xl font-bold text-brand-900">
          Send new or renewed details
        </h2>
        <ActionForm action={sendRenewal} submitLabel="Send to the office" pendingLabel="Sending…" className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm font-semibold text-brand-900">
              Which document?
              <select name="doc_type" required defaultValue={DOC_TYPES.some((d) => d.value === type) ? type : ""} className={input}>
                <option value="" disabled>
                  Choose…
                </option>
                {DOC_TYPES.filter((d) => d.value !== "other").map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-brand-900">
              Number (if any)
              <input name="reference" maxLength={100} className={input} />
            </label>
            <label className="text-sm font-semibold text-brand-900">
              New expiry date
              <input name="expires_on" type="date" min={today} className={input} />
            </label>
            <label className="col-span-2 text-sm font-semibold text-brand-900">
              Note (optional)
              <input name="note" maxLength={300} className={input} />
            </label>
          </div>
        </ActionForm>
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <h3 className="font-semibold text-brand-900">Add a photo or PDF of it</h3>
          <p className="mb-3 text-sm text-muted">Only the Chase Care office can see it.</p>
          <DocumentUploader
            ownerKind="worker"
            ownerId={worker.user.id}
            categories={[
              { value: "identity", label: "ID card or passport" },
              { value: "certificate", label: "Certificate or training" },
              { value: "assessment", label: "Police check or health check" },
            ]}
            large
            label="Choose a file"
          />
        </div>
      </section>
    </div>
  );
}
