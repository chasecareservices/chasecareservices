import Link from "next/link";
import { notFound } from "next/navigation";
import { IncidentStatus, SeverityBadge } from "@/components/care/IncidentBits";
import { formatIncidentTime, kindLabel, personLabel } from "@/lib/incidents";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Incident report" };

export default async function IncidentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  const worker = await requireWorker();
  const { data: r } = await worker.supabase
    .from("care_incidents")
    .select("id, reference, occurred_at, place, kind, severity, what_happened, action_taken, people_told, witnesses, status, client:care_clients(full_name, preferred_name)")
    .eq("id", id)
    .eq("reported_by", worker.user.id)
    .maybeSingle();
  if (!r) notFound();
  const client = r.client as unknown as { full_name: string; preferred_name: string | null } | null;
  const rows: [string, string][] = [
    ["Who", client?.preferred_name || client?.full_name || "Client"],
    ["When", formatIncidentTime(r.occurred_at)],
    ...(r.place ? [["Where", r.place] as [string, string]] : []),
    ["Kind", kindLabel(r.kind)],
    ["What happened", r.what_happened],
    ["What you did", r.action_taken],
    ["Who you told", r.people_told.length ? r.people_told.map(personLabel).join(", ") : "Nobody yet"],
    ...(r.witnesses ? [["Others who saw it", r.witnesses] as [string, string]] : []),
  ];
  return (
    <div>
      {sent && (
        <div role="status" className="mb-5 rounded-2xl bg-green-50 p-4 text-green-900 ring-1 ring-green-200">
          <p className="font-semibold">✓ Incident report sent. The office has been told.</p>
          {r.severity === "serious" && <p className="text-sm">As it is serious, please also phone the office now.</p>}
        </div>
      )}
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">{r.reference}</p>
      <h1 className="text-3xl font-bold text-brand-900">Incident report</h1>
      <p className="mt-2 flex flex-wrap gap-2">
        <SeverityBadge severity={r.severity} />
        <IncidentStatus status={r.status} />
      </p>
      <dl className="mt-5 divide-y divide-brand-100 rounded-2xl bg-white ring-1 ring-brand-100">
        {rows.map(([k, v]) => (
          <div key={k} className="px-4 py-3">
            <dt className="text-sm font-semibold text-muted">{k}</dt>
            <dd className="mt-0.5 whitespace-pre-line text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted">An incident report can&apos;t be changed once sent. If you remember something else, call the office.</p>
      <Link href="/portal/incidents" className="mt-5 inline-flex min-h-12 items-center font-semibold text-brand-800 underline">
        ← My incident reports
      </Link>
    </div>
  );
}
