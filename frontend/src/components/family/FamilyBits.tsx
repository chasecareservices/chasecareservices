/** Visit status in words that make sense to a family (not the office's "missed"). */
const STATUS: Record<string, { label: string; icon: string; cls: string }> = {
  done: { label: "Visited", icon: "✓", cls: "bg-green-100 text-green-800" },
  missed: { label: "Report to follow", icon: "…", cls: "bg-gray-100 text-gray-800" },
  in_progress: { label: "Visit happening now", icon: "●", cls: "bg-accent-100 text-accent-800" },
  upcoming: { label: "Booked", icon: "○", cls: "bg-brand-100 text-brand-800" },
  cancelled: { label: "Cancelled", icon: "×", cls: "bg-gray-200 text-gray-700" },
};

export function FamilyVisitStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.upcoming;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span> {s.label}
    </span>
  );
}
