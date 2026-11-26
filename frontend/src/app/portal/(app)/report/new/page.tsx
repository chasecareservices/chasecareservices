import Link from "next/link";
import { ReportForm } from "@/components/portal/ReportForm";
import { EMPTY_REPORT, todayInGhana } from "@/lib/care";
import { getSiteSettings } from "@/lib/content";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "New report" };

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const worker = await requireWorker();
  const [{ data: clients }, settings, { data: plans }] = await Promise.all([
    worker.supabase.from("care_clients").select("id, full_name, preferred_name").order("full_name"),
    getSiteSettings(),
    worker.supabase.from("care_plans").select("client_id, visit_tasks"),
  ]);
  const list = (clients ?? []).map((c) => ({ id: c.id, name: c.preferred_name || c.full_name, fullName: c.full_name }));

  if (!list.length) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-brand-100">
        <h1 className="text-2xl font-bold text-brand-900">No clients yet</h1>
        <p className="mt-2 text-muted">You can write a report once the office has assigned you to a client. Please call the office.</p>
        <Link href="/portal" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand-800 px-5 font-semibold text-white">
          Back to today
        </Link>
      </div>
    );
  }

  // Sensible defaults: the chosen (or only) client, today's date. The worker can change any of them.
  const chosen = list.find((c) => c.id === client)?.id ?? (list.length === 1 ? list[0].id : "");
  return (
    <ReportForm
      clients={list}
      initial={{ ...EMPTY_REPORT, client_id: chosen, visit_date: todayInGhana() }}
      officePhone={settings.phone}
      planTasks={Object.fromEntries((plans ?? []).map((p) => [p.client_id, p.visit_tasks]))}
    />
  );
}
