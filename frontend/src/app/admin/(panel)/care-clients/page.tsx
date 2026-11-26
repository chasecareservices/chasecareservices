import Link from "next/link";
import { inviteWorker, saveClient } from "./actions";
import { ClientFields } from "./ClientFields";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Clients & care workers" };

export default async function CareClientsPage({ searchParams }: { searchParams: Promise<{ saved?: string; who?: string }> }) {
  const { saved, who } = await searchParams;
  const staff = await requirePermission("clients.view");
  const [{ data: clients }, { data: assignments }, { data: workers }] = await Promise.all([
    staff.supabase.from("care_clients").select("id, full_name, preferred_name, area, is_active").order("is_active", { ascending: false }).order("full_name"),
    staff.supabase.from("care_assignments").select("client_id, worker_id").eq("is_active", true),
    staff.supabase.rpc("list_care_workers"),
  ]);
  const workerName = new Map((workers ?? []).map((w) => [w.id, w.full_name ?? w.email]));
  const teamOf = (clientId: string) => (assignments ?? []).filter((a) => a.client_id === clientId).map((a) => workerName.get(a.worker_id) ?? "—");
  const clientCount = (workerId: string) => (assignments ?? []).filter((a) => a.worker_id === workerId).length;

  return (
    <>
      {saved === "invited" && <Notice>Invitation sent to {who}. They&apos;ll get an email to choose a password, then they can sign in to the care worker portal.</Notice>}
      <PageHeader
        title="Clients & care workers"
        intro="Who receives care, and which care workers visit them. Care workers only see the clients you assign to them."
        actions={
          <Link href="/admin/care-reports" className="inline-flex min-h-11 items-center rounded-full border border-brand-300 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">
            Care reports
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="clients-h" className="space-y-4">
          <h2 id="clients-h" className="text-xl font-bold text-brand-900">
            Clients
          </h2>
          {!clients?.length ? (
            <Card>
              <p className="text-muted">No clients yet. Add the first one below.</p>
            </Card>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
              {clients.map((c) => {
                const team = teamOf(c.id);
                return (
                  <li key={c.id}>
                    <Link href={`/admin/care-clients/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-brand-50">
                      <span>
                        <span className="block font-semibold text-brand-900">
                          {c.full_name}
                          {!c.is_active && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Care ended</span>}
                        </span>
                        <span className="block text-sm text-muted">{c.area ?? "Area not set"}</span>
                      </span>
                      <span className={`text-sm ${team.length ? "text-ink" : "font-semibold text-amber-800"}`}>
                        {team.length ? `Care team: ${team.join(", ")}` : "! No care worker assigned"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {staff.can("clients.create") && (
            <Card title="Add a client">
              <ActionForm action={saveClient} submitLabel="Add client" inline>
                <ClientFields />
              </ActionForm>
            </Card>
          )}
        </section>

        <section id="care-workers" aria-labelledby="workers-h" className="scroll-mt-24 space-y-4">
          <h2 id="workers-h" className="text-xl font-bold text-brand-900">
            Care workers
          </h2>
          {!workers?.length ? (
            <Card>
              <p className="text-muted">No care workers yet. Invite one below.</p>
            </Card>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
              {workers.map((w) => (
                <li key={w.id} className="px-5 py-4">
                  <p className="font-semibold text-brand-900">
                    {w.full_name ?? w.email}
                    {!w.is_active && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Switched off</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {w.email}
                    {w.phone ? ` · ${w.phone}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {clientCount(w.id)} client{clientCount(w.id) === 1 ? "" : "s"} · last report {w.last_report_at ? formatDateTime(w.last_report_at) : "never"}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {staff.can("workforce.create") && (
            <Card title="Invite a care worker">
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
                  <p className="text-xs text-muted">They&apos;ll get an email to choose a password. They can only see the clients you assign to them.</p>
                </div>
              </ActionForm>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
