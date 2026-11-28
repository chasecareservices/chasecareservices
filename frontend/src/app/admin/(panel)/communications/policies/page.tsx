import Link from "next/link";
import { redirect } from "next/navigation";
import { savePolicy } from "../policy-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { PolicyFields } from "@/components/admin/PolicyFields";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/session";

export const metadata = { title: "Policies" };

export default async function PoliciesPage() {
  const staff = await requireStaff();
  if (!staff.can("communications.view") && !staff.can("workforce.view")) redirect("/admin?denied=1");
  const [{ data: policies }, { data: acks }, { data: workers }] = await Promise.all([
    staff.supabase.from("policies").select("id, title, category, status, version, must_read, published_at").order("sort_order").order("title"),
    staff.supabase.from("policy_acknowledgements").select("policy_id, user_id, version"),
    staff.supabase.rpc("list_care_workers"),
  ]);
  const active = (workers ?? []).filter((w) => w.is_active);
  const readCount = (p: { id: string; version: number }) => new Set((acks ?? []).filter((a) => a.policy_id === p.id && a.version === p.version && active.some((w) => w.id === a.user_id)).map((a) => a.user_id)).size;
  const canEdit = staff.can("communications.edit") || staff.can("workforce.edit");
  return (
    <>
      <PageHeader title="Policies" intro="The policies library care workers read in their portal. For must-read policies, you can see who has confirmed they read the current version." />
      <div className="mb-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Policy</th>
              <th scope="col" className="px-4 py-3">Version</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Read by care workers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(policies ?? []).map((p) => {
              const n = readCount(p);
              return (
                <tr key={p.id} className="relative hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/communications/policies/${p.id}`} className="font-semibold text-brand-800 underline after:absolute after:inset-0">
                      {p.title}
                    </Link>
                    {p.category && <span className="block text-xs text-muted">{p.category}</span>}
                  </td>
                  <td className="px-4 py-3">v{p.version}</td>
                  <td className="px-4 py-3">{p.status[0].toUpperCase() + p.status.slice(1)}</td>
                  <td className={`px-4 py-3 ${p.status === "published" && p.must_read && n < active.length ? "font-semibold text-amber-800" : ""}`}>
                    {p.status === "published" && p.must_read && active.length ? `${n} of ${active.length}` : "—"}
                  </td>
                </tr>
              );
            })}
            {!policies?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No policies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <Card title="Add a policy" className="max-w-4xl">
          <ActionForm action={savePolicy} submitLabel="Save policy">
            <PolicyFields />
          </ActionForm>
        </Card>
      )}
    </>
  );
}
