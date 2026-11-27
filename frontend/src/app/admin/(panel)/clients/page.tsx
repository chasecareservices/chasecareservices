import Link from "next/link";
import { saveClient } from "../care-clients/actions";
import { ClientFields } from "../care-clients/ClientFields";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Clients" };

const FILTERS = [
  { key: "active", label: "Receiving care" },
  { key: "ended", label: "Care ended" },
  { key: "all", label: "All" },
] as const;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const { q = "", show = "active" } = await searchParams;
  const staff = await requirePermission("clients.view");
  const term = q.trim().replace(/[%_,()]/g, "");
  let query = staff.supabase
    .from("care_clients")
    .select("id, full_name, preferred_name, area, digital_address, emergency_contact_phone, is_active, created_at")
    .order("full_name")
    .limit(500);
  if (show === "active") query = query.eq("is_active", true);
  if (show === "ended") query = query.eq("is_active", false);
  if (term) query = query.or(`full_name.ilike.%${term}%,preferred_name.ilike.%${term}%,area.ilike.%${term}%`);
  const [{ data: clients }, { data: assignments }, { data: workers }, { data: plans }] = await Promise.all([
    query,
    staff.supabase.from("care_assignments").select("client_id, worker_id").eq("is_active", true),
    staff.supabase.rpc("list_care_workers"),
    staff.supabase.from("care_plans").select("client_id, review_date"),
  ]);
  const workerName = new Map((workers ?? []).map((w) => [w.id, (w.full_name ?? w.email ?? "").replace(/\s*\(.*\)$/, "")]));
  const teamOf = (id: string) => (assignments ?? []).filter((a) => a.client_id === id).map((a) => workerName.get(a.worker_id) ?? "—");
  const planOf = new Map((plans ?? []).map((p) => [p.client_id, p.review_date]));
  const today = new Date().toISOString().slice(0, 10);
  const link = (p: Record<string, string>) => `/admin/clients?${new URLSearchParams({ show, ...(q ? { q } : {}), ...p })}`;

  return (
    <>
      <PageHeader
        title="Clients"
        intro="Everyone Chase Care supports. Click a client to see their full file: details, care plan, care team, visits, reports, incidents and documents."
        actions={
          staff.can("clients.create") ? (
            <a href="#add-client" className="inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Add a client
            </a>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Filter clients" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={link({ show: f.key })}
              aria-current={show === f.key ? "page" : undefined}
              className="min-h-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50 aria-[current=page]:bg-brand-800 aria-[current=page]:text-white"
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/clients" className="flex gap-2">
          <input type="hidden" name="show" value={show} />
          <label htmlFor="client-search" className="sr-only">
            Search clients
          </label>
          <input id="client-search" name="q" defaultValue={q} placeholder="Search by name or area" className="min-h-10 w-56 rounded-lg border border-gray-300 bg-white px-3 text-sm" />
          <button type="submit" className="min-h-10 rounded-full bg-brand-800 px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </div>

      {!clients?.length ? (
        <Card>
          <p className="text-muted">
            {term ? "No clients match that search." : "No clients here yet. Add one below, or create one from a care request in "}
            {!term && (
              <Link href="/admin/enquiries?type=care_request" className="font-semibold text-brand-700 underline">
                Enquiries
              </Link>
            )}
            {!term && "."}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Client</th>
                <th scope="col" className="px-4 py-3">Area</th>
                <th scope="col" className="px-4 py-3">Care team</th>
                <th scope="col" className="px-4 py-3">Care plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => {
                const team = teamOf(c.id);
                const review = planOf.get(c.id);
                return (
                  <tr key={c.id} className="relative hover:bg-brand-50 focus-within:bg-brand-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/care-clients/${c.id}`}
                        className="font-semibold text-brand-800 underline underline-offset-2 after:absolute after:inset-0 after:content-['']"
                      >
                        {c.full_name}
                      </Link>
                      {c.preferred_name && <span className="block text-muted">“{c.preferred_name}”</span>}
                      {!c.is_active && <span className="mt-1 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Care ended</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.area ?? <span className="text-muted">Not set</span>}
                      {c.digital_address && <span className="block font-mono text-xs text-muted">{c.digital_address}</span>}
                    </td>
                    <td className="px-4 py-3">{team.length ? team.join(", ") : <span className="font-semibold text-amber-800">! None yet</span>}</td>
                    <td className="px-4 py-3">
                      {review === undefined ? (
                        <span className="text-amber-800">No plan yet</span>
                      ) : review && review <= today ? (
                        <span className="font-semibold text-red-800">Review due</span>
                      ) : (
                        <span className="text-green-800">✓ In place</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {staff.can("clients.create") && (
        <section id="add-client" className="mt-8 scroll-mt-24">
          <Card title="Add a client">
            <ActionForm action={saveClient} submitLabel="Add client" inline>
              <ClientFields />
            </ActionForm>
          </Card>
        </section>
      )}
    </>
  );
}
