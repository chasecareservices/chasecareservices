import Link from "next/link";
import { notFound } from "next/navigation";
import { saveAssignments, saveClient } from "../actions";
import { ClientFields } from "../ClientFields";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { ConcernBadge, Mood, formatVisitDate } from "@/components/portal/ReportBits";
import { requirePermission } from "@/lib/admin/session";
import { mapsEmbed, mapsLink } from "@/lib/care";

export const metadata = { title: "Client" };

export default async function CareClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const staff = await requirePermission("clients.view");
  const [{ data: client }, { data: team }, { data: workers }, { data: reports }] = await Promise.all([
    staff.supabase.from("care_clients").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("care_assignments").select("worker_id").eq("client_id", id).eq("is_active", true),
    staff.supabase.rpc("list_care_workers"),
    staff.can("care_ops.view")
      ? staff.supabase.from("care_reports").select("id, visit_date, mood, concern_level, status").eq("client_id", id).order("visit_date", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
  ]);
  if (!client) notFound();
  const assigned = new Set((team ?? []).map((t) => t.worker_id));
  const canEdit = staff.can("clients.edit");

  return (
    <>
      {saved === "client" && <Notice>Client saved.</Notice>}
      {saved === "team" && <Notice>Care team saved. Assigned care workers can now see this client in their portal.</Notice>}
      <Link href="/admin/care-clients" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
        ← Clients &amp; care workers
      </Link>
      <div className="mt-3">
        <PageHeader title={client.full_name} intro={client.area ?? undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card title="Details">
          {canEdit ? (
            <ActionForm action={saveClient} submitLabel="Save details" inline>
              <input type="hidden" name="id" value={client.id} />
              <ClientFields client={client} showActive />
            </ActionForm>
          ) : (
            <p className="whitespace-pre-line">{client.care_summary ?? "No care notes yet."}</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Home location">
            {client.home_lat != null && client.home_lng != null ? (
              <>
                <iframe
                  title={`Map of ${client.full_name}'s home`}
                  src={mapsEmbed(client.home_lat, client.home_lng)}
                  loading="lazy"
                  className="h-48 w-full rounded-xl border-0 ring-1 ring-gray-200"
                />
                <a href={mapsLink(client.home_lat, client.home_lng)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">
                  Open in Google Maps ↗
                </a>
              </>
            ) : (
              <p className="text-sm text-muted">Not set. Visit reports can&apos;t be checked against the home until it is. Add it in the details form.</p>
            )}
          </Card>

          <Card title="Care team">
            {!workers?.length ? (
              <p className="text-sm text-muted">
                No care workers yet.{" "}
                <Link href="/admin/care-clients#care-workers" className="font-semibold text-brand-700 underline">
                  Invite one
                </Link>
                .
              </p>
            ) : canEdit ? (
              <ActionForm action={saveAssignments} submitLabel="Save care team" inline>
                <input type="hidden" name="client_id" value={client.id} />
                <fieldset>
                  <legend className="text-sm text-muted">Tick everyone who visits {client.preferred_name || client.full_name.split(" ")[0]}.</legend>
                  <div className="mt-2 space-y-1">
                    {workers.map((w) => (
                      <label key={w.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-brand-50">
                        <input type="checkbox" name="worker_id" value={w.id} defaultChecked={assigned.has(w.id)} disabled={!w.is_active && !assigned.has(w.id)} className="h-5 w-5 accent-brand-800" />
                        <span>
                          {w.full_name ?? w.email}
                          {!w.is_active && <span className="ml-1 text-xs text-muted">(switched off)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </ActionForm>
            ) : (
              <ul className="text-sm">{workers.filter((w) => assigned.has(w.id)).map((w) => <li key={w.id}>{w.full_name}</li>)}</ul>
            )}
          </Card>

          {staff.can("care_ops.view") && (
            <Card title="Recent reports">
              {!reports?.length ? (
                <p className="text-sm text-muted">No reports yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {reports.map((r) => (
                    <li key={r.id}>
                      <Link href={`/admin/care-reports/${r.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-50">
                        <span>
                          {formatVisitDate(r.visit_date)} · <Mood mood={r.mood} />
                        </span>
                        <span className="flex items-center gap-1">
                          <ConcernBadge level={r.concern_level} />
                          {r.status === "submitted" && <span className="rounded-full bg-accent-100 px-2 text-xs font-bold text-accent-700">New</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
