import { reportIncident } from "@/app/portal/incident-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { IncidentFields } from "@/components/care/IncidentFields";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Report an incident" };

export default async function NewIncidentPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const worker = await requireWorker();
  const [{ data: clients }, { data: settings }] = await Promise.all([
    worker.supabase.from("care_clients").select("id, full_name, preferred_name").order("full_name"),
    worker.supabase.from("site_settings").select("phone").maybeSingle(),
  ]);
  const list = (clients ?? []).map((c) => ({ id: c.id, name: c.preferred_name ? `${c.preferred_name} (${c.full_name})` : c.full_name }));
  const nowLocal = new Date().toISOString().slice(0, 16); // Ghana is on UTC

  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-900">Report an incident</h1>
      <p className="mt-1 text-muted">A fall, an injury, a medicine mistake, or anything that worried you. The office is told as soon as you send it.</p>
      <div role="note" className="mt-4 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-950">
        <p className="font-semibold">In an emergency, get help first.</p>
        <p className="text-sm">
          Call <a href="tel:112" className="font-semibold underline">112</a> (ambulance, police, fire)
          {settings?.phone ? (
            <>
              , then call the office on{" "}
              <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="font-semibold underline">
                {settings.phone}
              </a>
            </>
          ) : null}
          . Write this report afterwards.
        </p>
      </div>
      {!list.length ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-muted ring-1 ring-brand-100">You aren&apos;t assigned to any clients yet. Please call the office.</p>
      ) : (
        <ActionForm action={reportIncident} submitLabel="Send incident report" pendingLabel="Sending…" className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
          <IncidentFields clients={list} clientId={list.find((c) => c.id === client)?.id} nowLocal={nowLocal} />
        </ActionForm>
      )}
    </div>
  );
}
