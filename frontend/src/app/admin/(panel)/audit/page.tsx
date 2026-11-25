import Link from "next/link";
import { Card, PageHeader, formatDateTime } from "@/components/admin/ui";
import { TABLE_LABELS, actionLabel, changedFields, recordName, tableLabel } from "@/lib/admin/audit";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Activity log" };

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ table?: string; page?: string }> }) {
  const { table, page } = await searchParams;
  const staff = await requirePermission("audit.view");
  const current = Math.max(1, Number(page) || 1);
  const filter = table && table in TABLE_LABELS ? table : undefined;

  let query = staff.supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, table_name, action, record_id, old_data, new_data", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .range((current - 1) * PAGE_SIZE, current * PAGE_SIZE - 1);
  if (filter) query = query.eq("table_name", filter);
  const { data: rows, count } = await query;

  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: people } = actorIds.length
    ? await staff.supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name || "Staff member"]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (p: number) => `/admin/audit?${new URLSearchParams({ ...(filter ? { table: filter } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Activity log" intro="Every change made to the website and staff accounts, newest first. This log cannot be edited." />
      <form className="mb-4 flex flex-wrap items-end gap-2 text-sm" action="/admin/audit">
        <label className="font-medium text-brand-900">
          Show
          <select name="table" defaultValue={filter ?? ""} className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <option value="">Everything</option>
            {Object.entries(TABLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-full bg-brand-800 px-4 py-2 font-semibold text-white">
          Filter
        </button>
      </form>
      <Card>
        {!rows?.length ? (
          <p className="text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Who</th>
                  <th className="py-2 pr-4">What</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const old = r.old_data as Record<string, unknown> | null;
                  const neu = r.new_data as Record<string, unknown> | null;
                  const fields = changedFields(old, neu);
                  const name = recordName(old, neu, r.table_name);
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap py-3 pr-4 text-muted">{formatDateTime(r.occurred_at)}</td>
                      <td className="py-3 pr-4">{r.actor_id ? names.get(r.actor_id) ?? "Staff member" : <span className="text-muted">Website / system</span>}</td>
                      <td className="py-3 pr-4">
                        <strong className="text-brand-900">{actionLabel(r.action)}</strong> {tableLabel(r.table_name).toLowerCase()}
                        {name && <span className="block text-muted">{name}</span>}
                      </td>
                      <td className="py-3 text-muted">{fields.length ? `Changed: ${fields.map((f) => f.replace(/_/g, " ")).join(", ")}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-center gap-4 text-sm">
          {current > 1 && <Link href={link(current - 1)} className="font-semibold text-brand-700 underline">← Newer</Link>}
          <span className="text-muted">Page {current} of {pages}</span>
          {current < pages && <Link href={link(current + 1)} className="font-semibold text-brand-700 underline">Older →</Link>}
        </nav>
      )}
    </>
  );
}
