import Link from "next/link";
import { PageHeader, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { REQUEST_STATUS, kindShort, statusLabel, urgencyLabel } from "@/lib/wellbeing";

export const metadata = { title: "Wellbeing requests" };

const STATUS_STYLE: Record<string, string> = {
  new: "bg-accent-100 text-accent-900",
  in_progress: "bg-brand-100 text-brand-900",
  referred: "bg-blue-100 text-blue-900",
  closed: "bg-gray-100 text-gray-700",
};

export default async function WellbeingInbox({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const staff = await requirePermission("wellbeing.view");
  const show = status === "closed" ? ["closed"] : status && REQUEST_STATUS.some((s) => s.value === status) ? [status] : ["new", "in_progress", "referred"];
  const { data: rows } = await staff.supabase
    .from("wellbeing_requests")
    .select("id, reference, kind, urgency, status, created_at, updated_at, worker:profiles!wellbeing_requests_worker_id_fkey(full_name), assignee:profiles!wellbeing_requests_assigned_to_fkey(full_name)")
    .in("status", show)
    .order("updated_at", { ascending: false })
    .limit(300);
  const order = { urgent: 0, soon: 1, routine: 2 } as Record<string, number>;
  const list = (rows ?? []).sort((a, b) => (a.status === "new" ? 0 : 1) - (b.status === "new" ? 0 : 1) || order[a.urgency] - order[b.urgency]);
  const tabs = [
    { key: "", label: "Open" },
    { key: "new", label: "New" },
    { key: "referred", label: "Referred" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <>
      <PageHeader
        title="Wellbeing support requests"
        intro="Confidential requests from care workers. Only the wellbeing team can see this page: please don't discuss requests outside it."
      />
      <nav aria-label="Filter requests" className="mb-4 flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => {
          const active = (status ?? "") === t.key;
          return (
            <Link
              key={t.key}
              href={t.key ? `/admin/wellbeing?status=${t.key}` : "/admin/wellbeing"}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-4 font-semibold ${active ? "bg-brand-800 text-white" : "bg-white text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Request</th>
              <th scope="col" className="px-4 py-3">Care worker</th>
              <th scope="col" className="px-4 py-3">Support</th>
              <th scope="col" className="px-4 py-3">How soon</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((r) => {
              const worker = r.worker as unknown as { full_name: string | null } | null;
              const assignee = r.assignee as unknown as { full_name: string | null } | null;
              return (
                <tr key={r.id} className="relative hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/wellbeing/${r.id}`} className="font-semibold text-brand-800 underline after:absolute after:inset-0">
                      {r.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{worker?.full_name ?? "Care worker"}</td>
                  <td className="px-4 py-3">{kindShort(r.kind)}</td>
                  <td className={`px-4 py-3 ${r.urgency === "urgent" ? "font-semibold text-red-800" : ""}`}>{urgencyLabel(r.urgency)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{statusLabel(r.status, true)}</span>
                    {assignee?.full_name && <span className="block text-xs text-muted">{assignee.full_name}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(r.updated_at)}</td>
                </tr>
              );
            })}
            {!list.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No requests here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
