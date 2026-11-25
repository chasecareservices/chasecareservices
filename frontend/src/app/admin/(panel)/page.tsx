import Link from "next/link";
import { Card, Notice, PageHeader, StatusBadge, formatDateTime } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/session";
import { RESOURCES } from "@/lib/admin/resources";
import { CONTACT_TOPICS } from "@/lib/enquiry-topics";

export const metadata = { title: "Overview" };

const topicLabel = (t: string) => CONTACT_TOPICS.find((c) => c.value === t)?.label ?? t;

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const staff = await requireStaff();
  const db = staff.supabase;

  const canEnquiries = staff.can("enquiries.view");
  const [counts, recent, services, posts] = await Promise.all([
    canEnquiries ? db.rpc("enquiry_counts") : Promise.resolve({ data: [] }),
    canEnquiries
      ? db.from("enquiries").select("id, enquiry_type, status, full_name, country, created_at").order("created_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    db.from("services").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  const quickLinks = [
    ...(staff.can("content.edit") ? [{ label: "Homepage slider & banners", href: "/admin/homepage" }] : []),
    ...RESOURCES.filter((r) => staff.can(`${r.section}.view`)).map((r) => ({ label: r.title, href: `/admin/content/${r.key}` })),
    ...(staff.can("media.view") ? [{ label: "Media library", href: "/admin/media" }] : []),
  ];

  const byStatus = new Map((counts.data ?? []).map((c) => [c.status as string, Number(c.total)]));
  const stats = [
    canEnquiries && { label: "New enquiries", value: byStatus.get("new") ?? 0, href: "/admin/enquiries?status=new", highlight: true },
    canEnquiries && { label: "In progress", value: byStatus.get("in_progress") ?? 0, href: "/admin/enquiries?status=in_progress" },
    { label: "Published services", value: services.count ?? 0 },
    { label: "Published articles", value: posts.count ?? 0 },
  ].filter(Boolean) as { label: string; value: number; href?: string; highlight?: boolean }[];

  const firstName = staff.displayName.split(" ")[0];

  return (
    <>
      {denied && <Notice tone="error">You don&apos;t have permission to open that section.</Notice>}
      <PageHeader title={`Welcome, ${firstName}`} intro="Here's what is happening on the Chase Care website." />

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const inner = (
            <>
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className={`mt-1 text-3xl font-bold ${s.highlight && s.value > 0 ? "text-accent-700" : "text-brand-900"}`}>{s.value}</dd>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-brand-300">
              {inner}
            </Link>
          ) : (
            <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              {inner}
            </div>
          );
        })}
      </dl>

      {canEnquiries && (
        <Card title="Latest enquiries" className="mt-8">
          {(recent.data ?? []).length === 0 ? (
            <p className="text-muted">No enquiries yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {(recent.data ?? []).map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enquiries/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-gray-50">
                    <span>
                      <span className="font-semibold text-brand-900">{e.full_name}</span>
                      <span className="block text-sm text-muted">
                        {topicLabel(e.enquiry_type)}
                        {e.country && e.country !== "Ghana" ? ` · ${e.country}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-sm text-muted">
                      {formatDateTime(e.created_at)}
                      <StatusBadge status={e.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/enquiries" className="mt-4 inline-block text-sm font-semibold text-brand-700 underline">
            Open the inbox
          </Link>
        </Card>
      )}

      {quickLinks.length > 0 && (
        <Card title="Edit the website" className="mt-8">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-xl border border-gray-200 px-4 py-3 font-medium text-brand-800 hover:border-brand-300 hover:bg-brand-50">
                  {l.label} →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
