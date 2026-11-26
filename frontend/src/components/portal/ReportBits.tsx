import { CONCERNS, MOODS, labelOf } from "@/lib/care";

/** Where a report is: sent, or read by the office. Text plus icon, never colour alone. */
export function ReportStatus({ status }: { status: string }) {
  return status === "reviewed" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-800">
      <span aria-hidden="true">✓✓</span> Read by the office
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-sm font-semibold text-brand-800">
      <span aria-hidden="true">✓</span> Sent
    </span>
  );
}

export function ConcernBadge({ level }: { level: string }) {
  if (level === "none") return null;
  const urgent = level === "urgent";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
        urgent ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
      }`}
    >
      <span aria-hidden="true">{urgent ? "‼" : "!"}</span> {labelOf(CONCERNS, level)}
    </span>
  );
}

export function Mood({ mood }: { mood: string }) {
  const m = MOODS.find((x) => x.value === mood);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true">{m?.icon}</span>
      {m?.label ?? mood}
    </span>
  );
}

export function formatVisitDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
