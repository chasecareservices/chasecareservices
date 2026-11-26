import Link from "next/link";
import { PageHeader, StatusBadge, STATUS_LABELS, adminButtonSecondary, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { CONTACT_TOPICS, isEnquiryType } from "@/lib/enquiry-topics";
import type { Database } from "@/lib/database.types";

export const metadata = { title: "Enquiries" };

type Status = Database["public"]["Enums"]["enquiry_status"];
const STATUSES = Object.keys(STATUS_LABELS) as Status[];
const PAGE_SIZE = 25;

type Props = { searchParams: Promise<{ status?: string; type?: string; q?: string; page?: string }> };

export default async function EnquiriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const staff = await requirePermission("enquiries.view");
  const status = STATUSES.includes(params.status as Status) ? (params.status as Status) : undefined;
  const type = isEnquiryType(params.type) ? params.type : undefined;
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page) || 1);

  let query = staff.supabase
    .from("enquiries")
    .select("id, enquiry_type, status, full_name, email, phone, country, subject, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("enquiry_type", type);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},subject.ilike.${like}`);
  }
  const { data: rows, count, error } = await query;
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { status, type, q: q || undefined, ...overrides };
    Object.entries(merged).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    return `/admin/enquiries${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Enquiries" intro="Everything sent through the website's forms." />

      <form method="get" className="mb-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <label className="text-sm font-medium text-brand-900">
          Status
          <select name="status" defaultValue={status ?? ""} className={adminInput}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-brand-900">
          Type
          <select name="type" defaultValue={type ?? ""} className={adminInput}>
            <option value="">All</option>
            {CONTACT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-brand-900">
          Search name, email, phone or subject
          <input name="q" defaultValue={q} className={adminInput} />
        </label>
        <button type="submit" className={adminButtonSecondary}>
          Filter
        </button>
      </form>

      {error && <p className="text-red-700">Could not load enquiries: {error.message}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Received</th>
              <th scope="col" className="px-4 py-3">From</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(rows ?? []).map((e) => (
              <tr key={e.id} className="relative cursor-pointer hover:bg-brand-50 focus-within:bg-brand-50">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(e.created_at)}</td>
                <td className="px-4 py-3">
                  {/* The link covers the whole row, so anywhere on it opens the enquiry. */}
                  <Link
                    href={`/admin/enquiries/${e.id}`}
                    className="font-semibold text-brand-800 underline underline-offset-2 after:absolute after:inset-0 after:content-['']"
                  >
                    {e.full_name}
                  </Link>
                  <span className="block text-muted">
                    {[e.email, e.phone].filter(Boolean).join(" · ")}
                    {e.country && e.country !== "Ghana" ? ` · ${e.country}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {CONTACT_TOPICS.find((t) => t.value === e.enquiry_type)?.label ?? e.enquiry_type}
                  {e.subject && <span className="block text-muted">{e.subject}</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">
                  No enquiries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">
          {total} enquir{total === 1 ? "y" : "ies"} · page {page} of {pages}
        </span>
        <span className="flex gap-2">
          {page > 1 && (
            <Link href={link({ page: String(page - 1) })} className={adminButtonSecondary}>
              Previous
            </Link>
          )}
          {page < pages && (
            <Link href={link({ page: String(page + 1) })} className={adminButtonSecondary}>
              Next
            </Link>
          )}
        </span>
      </nav>
    </>
  );
}
