import Link from "next/link";
import { addRequest } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader, adminInput } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { REQUEST_KINDS, daysLeft, kindLabel } from "@/lib/data-requests";

export const metadata = { title: "Data requests" };

export default async function DataRequestsPage() {
  const staff = await requirePermission("users.view");
  const { data } = await staff.supabase.from("data_requests").select("id, person_name, kind, received_on, due_on, status").order("status").order("due_on").limit(200);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        title="Data requests"
        intro="When someone asks for a copy of their data, or asks you to correct or delete it, log it here and handle it from the request. Ghana's Data Protection Act 2012 gives people these rights: aim to answer within 30 days."
      />
      <div className="mb-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Person</th>
              <th scope="col" className="px-4 py-3">Request</th>
              <th scope="col" className="px-4 py-3">Received</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data ?? []).map((r) => {
              const left = daysLeft(r.due_on, today);
              return (
                <tr key={r.id} className="relative hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/data-requests/${r.id}`} className="font-semibold text-brand-800 underline after:absolute after:inset-0">
                      {r.person_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{kindLabel(r.kind)}</td>
                  <td className="px-4 py-3">{new Date(`${r.received_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</td>
                  <td className={`px-4 py-3 ${r.status === "open" && left < 0 ? "font-semibold text-red-800" : r.status === "open" && left <= 7 ? "font-semibold text-amber-800" : ""}`}>
                    {r.status === "open" ? (left < 0 ? `Overdue by ${-left} days` : `Open · ${left} days left`) : r.status === "done" ? "Done" : "Declined"}
                  </td>
                </tr>
              );
            })}
            {!data?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {staff.can("users.edit") && (
        <Card title="Log a new request" className="max-w-3xl">
          <ActionForm action={addRequest} submitLabel="Log request" inline>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-brand-900">
                Their name
                <input name="person_name" required maxLength={120} className={adminInput} />
              </label>
              <label className="text-sm font-medium text-brand-900">
                Their email (used to find their data)
                <input name="person_email" type="email" className={adminInput} />
              </label>
              <label className="text-sm font-medium text-brand-900">
                What they asked for
                <select name="kind" required defaultValue="access" className={adminInput}>
                  {REQUEST_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-brand-900">
                Received on
                <input name="received_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={adminInput} />
              </label>
              <label className="text-sm font-medium text-brand-900 sm:col-span-2">
                Details (how they asked, what exactly)
                <textarea name="details" rows={3} maxLength={2000} className={adminInput} />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted">Before acting, make sure it really is them (e.g. reply to the email address on record, or check ID).</p>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
