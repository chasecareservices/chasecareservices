import { kindShort, resourceKindLabel } from "@/lib/wellbeing";

export type ServiceRow = {
  id: string;
  name: string;
  kind: string;
  provider: string | null;
  description: string | null;
  benefit: string | null;
  how_to_access: string | null;
  location: string | null;
  phone: string | null;
  website_url: string | null;
};
export type ResourceRow = { id: string; title: string; kind: string; summary: string | null; url: string | null; starts_at: string | null; place: string | null };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "UTC" });

/** Services & partners, as cards. Used on the public page and in the portal. */
export function ServiceCards({ services, headingLevel = 3 }: { services: ServiceRow[]; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {services.map((s) => (
        <li key={s.id} className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-brand-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">{kindShort(s.kind)}</p>
          <H className="mt-1 text-lg font-bold text-brand-900">{s.name}</H>
          {s.provider && <p className="text-sm text-muted">{s.provider}</p>}
          {s.benefit && <p className="mt-2 inline-block self-start rounded-full bg-accent-100 px-3 py-1 text-sm font-semibold text-accent-900">{s.benefit}</p>}
          {s.description && <p className="mt-2 whitespace-pre-line text-sm">{s.description}</p>}
          {s.how_to_access && (
            <p className="mt-2 text-sm">
              <span className="font-semibold text-brand-900">How to get it: </span>
              {s.how_to_access}
            </p>
          )}
          <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-sm">
            {s.location && <span className="text-muted">{s.location}</span>}
            {s.phone && (
              <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand-700 underline">
                {s.phone}
              </a>
            )}
            {s.website_url && (
              <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
                Website<span className="sr-only"> for {s.name} (opens in a new tab)</span>
              </a>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Webinars and support sessions coming up. */
export function UpcomingSessions({ rows }: { rows: ResourceRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <div className="flex w-16 flex-none flex-col items-center justify-center rounded-xl bg-brand-800 py-2 text-white">
            <span className="text-2xl font-bold leading-none">{new Date(r.starts_at!).getUTCDate()}</span>
            <span className="text-xs uppercase">{new Date(r.starts_at!).toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">{resourceKindLabel(r.kind)}</p>
            <p className="font-bold text-brand-900">{r.title}</p>
            <p className="text-sm text-muted">
              {when(r.starts_at!)}
              {r.place ? ` · ${r.place}` : ""}
            </p>
            {r.summary && <p className="mt-1 text-sm">{r.summary}</p>}
            {r.url && (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-brand-700 underline">
                Join or find out more<span className="sr-only">: {r.title} (opens in a new tab)</span>
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Articles, videos, leaflets and links. */
export function ResourceList({ rows }: { rows: ResourceRow[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl bg-white p-4 ring-1 ring-brand-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">{resourceKindLabel(r.kind)}</p>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-800 underline">
              {r.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <p className="font-bold text-brand-900">{r.title}</p>
          )}
          {r.summary && <p className="mt-1 text-sm">{r.summary}</p>}
        </li>
      ))}
    </ul>
  );
}
