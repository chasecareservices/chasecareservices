import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportForm } from "@/components/portal/ReportForm";
import { getSiteSettings } from "@/lib/content";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Correct report" };

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const worker = await requireWorker();
  const [{ data: r }, { data: clients }, settings, { data: plans }] = await Promise.all([
    worker.supabase.from("care_reports").select("*").eq("id", id).maybeSingle(),
    worker.supabase.from("care_clients").select("id, full_name, preferred_name").order("full_name"),
    getSiteSettings(),
    worker.supabase.from("care_plans").select("client_id, visit_tasks"),
  ]);
  if (!r) notFound();
  if (r.status !== "submitted") {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-brand-100">
        <h1 className="text-2xl font-bold text-brand-900">This report can&apos;t be changed</h1>
        <p className="mt-2 text-muted">The office has already read it. Please call the office if something needs correcting.</p>
        <Link href={`/portal/report/${id}`} className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand-800 px-5 font-semibold text-white">
          Back to the report
        </Link>
      </div>
    );
  }
  // The report's own client stays selectable, even if the assignment has since changed.
  const list = (clients ?? [])
    .filter((c) => c.id === r.client_id)
    .map((c) => ({ id: c.id, name: c.preferred_name || c.full_name, fullName: c.full_name }));
  return (
    <ReportForm
      reportId={r.id}
      planTasks={Object.fromEntries((plans ?? []).map((p) => [p.client_id, p.visit_tasks]))}
      clients={list}
      officePhone={settings.phone}
      initial={{
        client_id: r.client_id,
        shift_id: r.shift_id ?? "",
        visit_date: r.visit_date,
        start_time: r.start_time?.slice(0, 5) ?? "",
        end_time: r.end_time?.slice(0, 5) ?? "",
        mood: r.mood,
        activities: r.activities,
        tasks_done: r.tasks_done,
        meals: r.meals ?? "",
        medication: r.medication ?? "",
        summary: r.summary,
        concern_level: r.concern_level,
        concerns: r.concerns ?? "",
      }}
    />
  );
}
