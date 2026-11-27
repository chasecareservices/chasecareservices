import Link from "next/link";
import { redirect } from "next/navigation";
import { inviteWorker } from "../care-clients/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/session";

export const metadata = { title: "Care workers" };

export default async function CareWorkersPage({ searchParams }: { searchParams: Promise<{ saved?: string; who?: string }> }) {
  const { saved, who } = await searchParams;
  const staff = await requireStaff();
  if (!staff.can("clients.view") && !staff.can("care_ops.view")) redirect("/admin?denied=1");
  const [{ data: workers }, { data: assignments }] = await Promise.all([
    staff.supabase.rpc("list_care_workers"),
    staff.supabase.from("care_assignments").select("client_id, worker_id").eq("is_active", true),
  ]);
  const clientCount = (id: string) => (assignments ?? []).filter((a) => a.worker_id === id).length;

  return (
    <>
      {saved === "invited" && <Notice>Invitation sent to {who}. They&apos;ll get an email to choose a password, then they can sign in to the care worker portal.</Notice>}
      <PageHeader title="Care workers" intro="Everyone who visits clients. Click a care worker to see their details, clients, visits, reports and documents." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {!workers?.length ? (
          <Card>
            <p className="text-muted">No care workers yet. Invite the first one.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Care worker</th>
                  <th scope="col" className="px-4 py-3">Contact</th>
                  <th scope="col" className="px-4 py-3">Clients</th>
                  <th scope="col" className="px-4 py-3">Last report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workers.map((w) => (
                  <tr key={w.id} className="relative hover:bg-brand-50 focus-within:bg-brand-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/care-workers/${w.id}`}
                        className="font-semibold text-brand-800 underline underline-offset-2 after:absolute after:inset-0 after:content-['']"
                      >
                        {w.full_name ?? w.email}
                      </Link>
                      {!w.is_active && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Switched off</span>}
                    </td>
                    <td className="px-4 py-3">
                      {w.email}
                      {w.phone && <span className="block text-muted">{w.phone}</span>}
                    </td>
                    <td className="px-4 py-3">{clientCount(w.id)}</td>
                    <td className="px-4 py-3">{w.last_report_at ? formatDateTime(w.last_report_at) : <span className="text-muted">Never</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {staff.can("workforce.create") && (
          <Card title="Invite a care worker" className="h-fit">
            <ActionForm action={inviteWorker} submitLabel="Send invitation" pendingLabel="Sending…" inline>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-brand-900">
                  Full name
                  <input name="full_name" required maxLength={120} className={adminInput} />
                </label>
                <label className="block text-sm font-medium text-brand-900">
                  Email
                  <input name="email" type="email" required className={adminInput} />
                </label>
                <label className="block text-sm font-medium text-brand-900">
                  Phone (optional)
                  <input name="phone" type="tel" maxLength={40} className={adminInput} />
                </label>
                <p className="text-xs text-muted">They&apos;ll get an email to choose a password. Book them a visit and they&apos;re added to that client&apos;s care team.</p>
              </div>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
