import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice, PageHeader, adminButton, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { getResource } from "@/lib/admin/resources";

type Props = { params: Promise<{ resource: string }>; searchParams: Promise<{ deleted?: string }> };

export async function generateMetadata({ params }: Props) {
  return { title: getResource((await params).resource)?.title ?? "Content" };
}

const STATUS_STYLE: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-gray-200 text-gray-700",
  archived: "bg-gray-100 text-gray-500",
};

export default async function ResourceListPage({ params, searchParams }: Props) {
  const resource = getResource((await params).resource);
  if (!resource) notFound();
  const { deleted } = await searchParams;
  const staff = await requirePermission(`${resource.section}.view`);

  const columns = ["id", "slug", "status", "service_group", ...resource.columns.map((c) => c.name)];
  const available = new Set(resource.fields.map((f) => f.name).concat(["id"]));
  let query = staff.supabase.from(resource.table as "services").select([...new Set(columns.filter((c) => available.has(c)))].join(", "));
  for (const o of resource.order) query = query.order(o.column, { ascending: o.ascending, nullsFirst: false });
  if (resource.exclude) query = query.neq(resource.exclude.column, resource.exclude.value);
  const { data, error } = await query.limit(500);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];

  const show = (row: Record<string, unknown>, name: string) => {
    const col = resource.columns.find((c) => c.name === name);
    const v = row[name];
    if (name === "status") return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[String(v)] ?? ""}`}>{col?.options?.find((o) => o.value === v)?.label.replace(/ \(hidden\)/, "") ?? String(v)}</span>;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (/_at$/.test(name)) return formatDateTime(v as string | null);
    if (v === null || v === undefined || v === "") return <span className="text-muted">—</span>;
    return col?.options?.find((o) => o.value === v)?.label ?? String(v);
  };

  return (
    <>
      {deleted && <Notice>Deleted.</Notice>}
      <PageHeader
        title={resource.title}
        intro={resource.intro}
        actions={
          staff.can(`${resource.section}.create`) && (
            <Link href={`/admin/content/${resource.key}/new`} className={adminButton}>
              Add {resource.singular}
            </Link>
          )
        }
      />
      {error && <Notice tone="error">Could not load this list: {error.message}</Notice>}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              {resource.columns.map((c) => (
                <th key={c.name} scope="col" className="px-4 py-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={String(row.id)} className="hover:bg-gray-50">
                {resource.columns.map((c, i) => (
                  <td key={c.name} className="px-4 py-3">
                    {i === 0 ? (
                      <Link href={`/admin/content/${resource.key}/${row.id}`} className="font-semibold text-brand-800 underline-offset-2 hover:underline">
                        {String(row[c.name] ?? "(untitled)").slice(0, 90)}
                      </Link>
                    ) : (
                      show(row, c.name)
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={resource.columns.length} className="px-4 py-10 text-center text-muted">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
