import Link from "next/link";
import { notFound } from "next/navigation";
import { Mood, formatVisitDate } from "@/components/portal/ReportBits";
import { ACTIVITIES, MEALS, MEDICATION, labelOf, visitTimes } from "@/lib/care";
import { requireFamily } from "@/lib/family/session";

export const metadata = { title: "Visit report" };

export default async function FamilyReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ client?: string }> }) {
  const [{ id }, { client }, family] = await Promise.all([params, searchParams, requireFamily()]);
  if (!client || !/^[0-9a-f-]{36}$/.test(client)) notFound();
  const { data: reports } = await family.supabase.rpc("family_visit_reports", { client, max_rows: 100 });
  const r = reports?.find((x) => x.id === id);
  if (!r) notFound();
  const rows: [string, React.ReactNode][] = [
    ["Visit", `${formatVisitDate(r.visit_date)}, ${visitTimes(r.start_time, r.end_time)}`],
    ["Care worker", r.worker_first_name],
    ["Mood", <Mood key="m" mood={r.mood} />],
    ["What they did", r.activities.length ? r.activities.map((a) => labelOf(ACTIVITIES, a)).join(", ") : "—"],
    ["Meals", labelOf(MEALS, r.meals)],
    ["Medication", labelOf(MEDICATION, r.medication)],
    ...(r.tasks_done.length ? [["Care plan tasks done", r.tasks_done.join(", ")] as [string, React.ReactNode]] : []),
    ["How the visit went", r.summary],
  ];
  return (
    <div>
      <Link href={`/family?client=${client}`} className="inline-flex min-h-11 items-center font-semibold text-brand-800 underline">
        ← Back
      </Link>
      <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-accent-700">{r.reference}</p>
      <h1 className="text-3xl font-bold text-brand-900">Visit report</h1>
      <dl className="mt-5 divide-y divide-brand-100 rounded-2xl bg-white ring-1 ring-brand-100">
        {rows.map(([k, v]) => (
          <div key={k} className="px-4 py-3">
            <dt className="text-sm font-semibold text-muted">{k}</dt>
            <dd className="mt-0.5 whitespace-pre-line text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted">
        Questions about this visit?{" "}
        <Link href={`/family?client=${client}#message`} className="font-semibold text-brand-800 underline">
          Message the office
        </Link>
        .
      </p>
    </div>
  );
}
