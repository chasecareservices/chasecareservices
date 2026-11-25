import Link from "next/link";
import { AdminNav, type AdminNavGroup } from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/LogoMark";
import { signOut } from "@/app/admin/actions";
import { requireStaff } from "@/lib/admin/session";
import { RESOURCES } from "@/lib/admin/resources";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  let newEnquiries = 0;
  if (staff.can("enquiries.view")) {
    const { count } = await staff.supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
    newEnquiries = count ?? 0;
  }

  let careToRead = 0;
  if (staff.can("care_ops.view")) {
    const { data } = await staff.supabase.rpc("care_report_counts");
    careToRead = Number(data?.[0]?.to_read ?? 0);
  }

  const contentLinks = RESOURCES.filter((r) => staff.can(`${r.section}.view`)).map((r) => ({
    label: r.title,
    href: `/admin/content/${r.key}`,
  }));

  const groups: AdminNavGroup[] = [
    {
      items: [
        { label: "Overview", href: "/admin" },
        ...(staff.can("enquiries.view") ? [{ label: "Enquiries", href: "/admin/enquiries", badge: newEnquiries }] : []),
      ],
    },
    {
      title: "Care",
      items: [
        ...(staff.can("care_ops.view") ? [{ label: "Care reports", href: "/admin/care-reports", badge: careToRead }] : []),
        ...(staff.can("clients.view") ? [{ label: "Clients & care workers", href: "/admin/care-clients" }] : []),
      ],
    },
    {
      title: "Website",
      items: [
        ...(staff.can("content.edit") ? [{ label: "Homepage & banners", href: "/admin/homepage" }] : []),
        ...contentLinks,
        ...(staff.can("media.view") ? [{ label: "Media library", href: "/admin/media" }] : []),
      ],
    },
    {
      title: "Admin",
      items: [
        ...(staff.can("settings.view") ? [{ label: "Site settings", href: "/admin/settings" }] : []),
        ...(staff.can("users.view") ? [{ label: "Staff & roles", href: "/admin/users" }] : []),
        ...(staff.can("audit.view") ? [{ label: "Activity log", href: "/admin/audit" }] : []),
      ],
    },
  ].filter((g) => g.items.length);

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_1fr]">
      <aside className="relative flex items-center justify-between gap-4 bg-brand-900 px-4 py-3 text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:px-5 lg:py-6">
        <Link href="/admin" className="flex items-center gap-2.5">
          <LogoMark inverted className="h-9 w-auto" />
          <span>
            <span className="block font-display text-lg font-bold tracking-[0.18em]">
              C<span className="text-accent-400">H</span>A<span className="text-accent-400">S</span>E
            </span>
            <span className="block text-[0.65rem] font-semibold uppercase tracking-widest text-brand-200">Staff dashboard</span>
          </span>
        </Link>
        <div className="lg:mt-8">
          <AdminNav groups={groups} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-8">
          <p className="text-sm text-muted">
            Signed in as <strong className="text-brand-900">{staff.displayName}</strong>
          </p>
          <div className="flex items-center gap-3">
            <Link href="/" target="_blank" className="text-sm font-medium text-brand-700 underline">
              View website
            </Link>
            <form action={signOut}>
              <button type="submit" className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
