import type { ReactNode } from "react";

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 text-lg font-semibold text-brand-900">{title}</h2>}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-accent-100 text-accent-700",
  in_progress: "bg-blue-100 text-blue-800",
  contacted: "bg-brand-100 text-brand-800",
  converted: "bg-green-100 text-green-800",
  closed: "bg-gray-200 text-gray-700",
};

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  contacted: "Contacted",
  converted: "Converted",
  closed: "Closed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  }).format(new Date(value));
}

export const adminInput =
  "mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export const adminButton =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60";

export const adminButtonSecondary =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-gray-300 bg-white px-5 text-sm font-semibold text-brand-800 hover:bg-brand-50";

export function Notice({ tone = "success", children }: { tone?: "success" | "error" | "info"; children: ReactNode }) {
  const tones = {
    success: "border-green-200 bg-green-50 text-green-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-brand-200 bg-brand-50 text-brand-900",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}
