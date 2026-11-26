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

const VISIT_STYLES: Record<string, { label: string; icon: string; cls: string }> = {
  done: { label: "Report sent", icon: "✓", cls: "bg-green-100 text-green-800" },
  missed: { label: "No report yet", icon: "!", cls: "bg-red-100 text-red-800" },
  in_progress: { label: "Now", icon: "●", cls: "bg-accent-100 text-accent-700" },
  upcoming: { label: "Later", icon: "○", cls: "bg-brand-100 text-brand-800" },
  cancelled: { label: "Cancelled", icon: "×", cls: "bg-gray-200 text-gray-700" },
};

/** Where a booked visit stands. Text plus symbol, never colour alone. */
export function VisitStatus({ status }: { status: string }) {
  const s = VISIT_STYLES[status] ?? VISIT_STYLES.upcoming;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span> {s.label}
    </span>
  );
}

export const hhmm = (t: string) => t.slice(0, 5);
