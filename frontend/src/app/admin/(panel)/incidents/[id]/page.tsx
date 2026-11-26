import Link from "next/link";
import { notFound } from "next/navigation";
import { followUpIncident } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, adminInput, formatDateTime } from "@/components/admin/ui";
import { IncidentStatus, SeverityBadge } from "@/components/care/IncidentBits";
import { requirePermission } from "@/lib/admin/session";
import { INCIDENT_STATUS, formatIncidentTime, kindLabel, personLabel } from "@/lib/incidents";
import { phoneDigits } from "@/lib/format";

export const metadata = { title: "Incident" };

export default async function IncidentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const staff = await requirePermission("care_ops.view");
  const { data: r } = await staff.supabase
    .from("care_incidents")
    .select(
      "*, client:care_clients(id, full_name, emergency_contact_name, emergency_contact_phone), reporter:profiles!care_incidents_reported_by_fkey(full_name, phone)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const client = r.client as unknown as { id: string; full_name: string; emergency_contact_name: string | null; emergency_contact_phone: string | null };
  const reporter = r.reporter as unknown as { full_name: string | null; phone: string | null } | null;
  const [{ data: closer }, { data: others }] = await Promise.all([
    r.closed_by ? staff.supabase.from("profiles").select("full_name").eq("id", r.closed_by).maybeSingle() : Promise.resolve({ data: null }),
    staff.supabase
      .from("care_incidents")
      .select("id, reference, occurred_at, kind, severity")
      .eq("client_id", client.id)
      .neq("id", r.id)
      .order("occurred_at", { ascending: false })
      .limit(5),
  ]);

  const rows: [string, string][] = [
    ["When", formatIncidentTime(r.occurred_at)],
    ...(r.place ? [["Where", r.place] as [string, string]] : []),
    ["Kind", kindLabel(r.kind)],
    ["What happened", r.what_happened],
    ["What was done straight away", r.action_taken],
    ["Who was told", r.people_told.length ? r.people_told.map(personLabel).join(", ") : "Nobody yet"],
    ...(r.witnesses ? [["Others who saw it", r.witnesses] as [string, string]] : []),
    ["Reported", `${formatDateTime(r.created_at)} by ${reporter?.full_name ?? "staff"}`],
  ];

  return (
    <>
      {saved === "1" && <Notice>Incident saved. The care-concern contacts have been emailed.</Notice>}
      {saved === "followup" && <Notice>Follow-up saved.</Notice>}
      <Link href="/admin/incidents" className="text-sm font-semibold text-brand-700 underline">
        ← All incidents
      </Link>
      <div className="mt-2 mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">{r.reference}</p>
        <h1 className="text-2xl font-bold text-brand-900">
          {kindLabel(r.kind)}: {client.full_name}
        </h1>
        <p className="mt-2 flex flex-wrap gap-2">
          <SeverityBadge severity={r.severity} />
          <IncidentStatus status={r.status} />
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card title="What was reported">
            <dl className="divide-y divide-gray-100">
              {rows.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-sm font-semibold text-muted">{k}</dt>
                  <dd className="whitespace-pre-line text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">What was reported can&apos;t be edited. Add anything new in the follow-up notes.</p>
          </Card>

          <Card title="Follow-up">
            {staff.can("care_ops.edit") ? (
              <ActionForm action={followUpIncident} submitLabel="Save follow-up">
                <input type="hidden" name="id" value={r.id} />
                <fieldset>
                  <legend className="text-sm font-medium text-brand-900">Where does it stand?</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(INCIDENT_STATUS).map(([value, label]) => (
                      <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 ring-1 ring-gray-300 has-[:checked]:bg-brand-50 has-[:checked]:ring-2 has-[:checked]:ring-brand-700">
                        <input type="radio" name="status" value={value} defaultChecked={r.status === value} className="accent-brand-700" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-4 block text-sm font-medium text-brand-900">
                  Office notes
                  <span className="block font-normal text-muted">Who you spoke to, what was done, and what will stop it happening again. Needed to close.</span>
                  <textarea name="office_notes" rows={6} maxLength={4000} defaultValue={r.office_notes ?? ""} className={adminInput} />
                </label>
              </ActionForm>
            ) : (
              <p className="whitespace-pre-line text-ink">{r.office_notes || "No follow-up notes yet."}</p>
            )}
            {r.status === "closed" && r.closed_at && (
              <p className="mt-3 text-sm text-muted">
                Closed {formatDateTime(r.closed_at)}
                {closer?.full_name ? ` by ${closer.full_name}` : ""}.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Contacts">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-muted">Reported by</dt>
                <dd>
                  {reporter?.full_name ?? "Staff"}
                  {reporter?.phone && (
                    <a href={`tel:${phoneDigits(reporter.phone)}`} className="ml-2 font-semibold text-brand-700 underline">
                      Call {reporter.phone}
                    </a>
                  )}
                </dd>
              </div>
              {client.emergency_contact_name && (
                <div>
                  <dt className="font-semibold text-muted">Family / emergency contact</dt>
                  <dd>
                    {client.emergency_contact_name}
                    {client.emergency_contact_phone && (
                      <a href={`tel:${phoneDigits(client.emergency_contact_phone)}`} className="ml-2 font-semibold text-brand-700 underline">
                        Call {client.emergency_contact_phone}
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
            <Link href={`/admin/care-clients/${client.id}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline">
              Client details and care plan
            </Link>
          </Card>
          <Card title="Earlier incidents for this client">
            {!others?.length ? (
              <p className="text-sm text-muted">None.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/incidents/${o.id}`} className="font-semibold text-brand-700 underline">
                      {o.reference}
                    </Link>{" "}
                    {kindLabel(o.kind)}, {formatIncidentTime(o.occurred_at)} <SeverityBadge severity={o.severity} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
