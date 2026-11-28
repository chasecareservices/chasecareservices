import Link from "next/link";
import { sendRemindersNow } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { STATE_STYLE } from "@/components/admin/CredentialsPanel";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/session";
import { redirect } from "next/navigation";
import { DOC_TYPES, compliance, overall, stateText, type Credential } from "@/lib/credentials";

export const metadata = { title: "Worker documents" };

export default async function WorkerDocuments({ searchParams }: { searchParams: Promise<{ show?: string; saved?: string; n?: string; d?: string }> }) {
  const { show, saved, n, d } = await searchParams;
  const staff = await requireStaff();
  if (!staff.can("workforce.view") && !staff.can("care_ops.view")) redirect("/admin?denied=1");
  const sb = staff.supabase;
  const [{ data: workers }, { data: creds }, { data: profiles }] = await Promise.all([
    sb.rpc("list_care_workers"),
    sb.from("worker_credentials").select("id, worker_id, doc_type, title, reference, issued_on, expires_on, status, note, created_at"),
    sb.from("worker_profiles").select("worker_id, skills"),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const columns = DOC_TYPES.filter((t) => t.required);
  const list = (workers ?? [])
    .filter((w) => w.is_active)
    .map((w) => {
      const rows = compliance(
        ((creds ?? []).filter((c) => c.worker_id === w.id) as Credential[]),
        (profiles ?? []).find((p) => p.worker_id === w.id)?.skills ?? [],
        today,
      );
      return { w, rows, sum: overall(rows) };
    })
    .sort((a, b) => ({ problem: 0, attention: 1, ok: 2 })[a.sum.level] - ({ problem: 0, attention: 1, ok: 2 })[b.sum.level] || (a.w.full_name ?? "").localeCompare(b.w.full_name ?? ""));
  const shown = show === "all" ? list : list.filter((x) => x.sum.level !== "ok");
  const pending = (creds ?? []).filter((c) => c.status === "pending").length;

  return (
    <>
      {saved === "reminded" && (
        <Notice>
          {Number(d) ? `Reminders sent: ${n} care ${n === "1" ? "worker" : "workers"} emailed about ${d} ${d === "1" ? "document" : "documents"}, and the office summary sent.` : "No new reminders were due: everyone has already been reminded."}
        </Notice>
      )}
      <PageHeader
        title="Worker documents"
        intro="ID, police checks, first aid, safeguarding and health checks for every care worker. Reminders are emailed automatically 30 days and 7 days before a document expires, and when it does."
        actions={
          staff.can("workforce.edit") ? (
            <ActionForm action={sendRemindersNow} submitLabel="Send due reminders now" pendingLabel="Sending…" inline secondary>
              <span />
            </ActionForm>
          ) : null
        }
      />
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Need action", list.filter((x) => x.sum.level === "problem").length, "text-red-800"],
          ["Expiring soon or to check", list.filter((x) => x.sum.level === "attention").length, "text-amber-800"],
          ["Renewed details to check", pending, "text-blue-800"],
        ].map(([k, v, c]) => (
          <div key={String(k)} className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
            <dt className="text-sm font-semibold text-muted">{k}</dt>
            <dd className={`mt-1 text-3xl font-bold ${c}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <nav aria-label="Which workers" className="mb-4 flex gap-2 text-sm">
        {[
          ["", "Needs attention"],
          ["all", "Everyone"],
        ].map(([k, l]) => (
          <Link
            key={l}
            href={k ? "/admin/worker-documents?show=all" : "/admin/worker-documents"}
            aria-current={(show ?? "") === k ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-4 font-semibold ${(show ?? "") === k ? "bg-brand-800 text-white" : "bg-white text-brand-800 ring-1 ring-gray-200"}`}
          >
            {l}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-3">Care worker</th>
              {columns.map((c) => (
                <th key={c.value} scope="col" className="px-3 py-3">
                  {c.label.replace(" certificate", "").replace(" (medical fitness)", "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map(({ w, rows, sum }) => (
              <tr key={w.id} className="align-top">
                <th scope="row" className="px-3 py-3">
                  <Link href={`/admin/care-workers/${w.id}#checks`} className="font-semibold text-brand-800 underline">
                    {w.full_name ?? w.email}
                  </Link>
                  <span className={`block text-xs ${sum.level === "problem" ? "text-red-800" : sum.level === "attention" ? "text-amber-800" : "text-green-800"}`}>{sum.text}</span>
                </th>
                {columns.map((c) => {
                  const r = rows.find((x) => x.type === c.value)!;
                  return (
                    <td key={c.value} className="px-3 py-3">
                      <span className={`inline-block rounded-lg px-2 py-1 text-xs font-semibold ${STATE_STYLE[r.state]}`}>{stateText(r)}</span>
                      {r.pending && r.state !== "pending" && <span className="mt-1 block text-xs text-blue-800">Renewal sent: check it</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-muted">
                  {show === "all" ? "No active care workers." : "Everyone's documents are in order. ✓"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        A passport counts as ID instead of a Ghana Card. Nurses also need a nursing licence (shown on their page). The office summary goes to the address in Site settings → Email alerts.
      </p>
    </>
  );
}
