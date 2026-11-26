import { INCIDENT_STATUS, severityLabel } from "@/lib/incidents";

/** Severity with a symbol and a word, never colour alone. */
export function SeverityBadge({ severity }: { severity: string }) {
  const style =
    severity === "serious" ? "bg-red-100 text-red-900 ring-red-300" : severity === "moderate" ? "bg-amber-100 text-amber-950 ring-amber-300" : "bg-gray-100 text-gray-800 ring-gray-300";
  const mark = severity === "serious" ? "!!" : severity === "moderate" ? "!" : "·";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ${style}`}>
      <span aria-hidden="true">{mark}</span>
      {severityLabel(severity)}
    </span>
  );
}

export function IncidentStatus({ status }: { status: string }) {
  const style = status === "closed" ? "bg-green-50 text-green-900 ring-green-200" : status === "investigating" ? "bg-brand-50 text-brand-900 ring-brand-200" : "bg-white text-brand-900 ring-brand-300";
  const mark = status === "closed" ? "✓" : status === "investigating" ? "…" : "○";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ${style}`}>
      <span aria-hidden="true">{mark}</span>
      {INCIDENT_STATUS[status] ?? status}
    </span>
  );
}
