import { Container } from "@/components/ui";
import { getSiteSettings, impactStatsFrom, recognitionsFrom } from "@/lib/content";

/**
 * Row of key figures from the site settings. Hidden until real figures are entered —
 * never fill this with estimates.
 */
export async function ImpactStats({ tone = "tint" }: { tone?: "tint" | "brand" }) {
  const stats = impactStatsFrom(await getSiteSettings());
  if (!stats.length) return null;
  const brand = tone === "brand";
  return (
    <section aria-label="Our impact" className={brand ? "bg-brand-800 text-white" : "bg-brand-50"}>
      <Container className="py-10 sm:py-12">
        <dl className={`grid gap-8 text-center ${stats.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse">
              <dt className={`mt-1 font-semibold ${brand ? "text-brand-100" : "text-brand-900"}`}>
                {s.label}
                {s.detail && <span className={`block text-sm font-normal ${brand ? "text-brand-200" : "text-muted"}`}>{s.detail}</span>}
              </dt>
              <dd className={`text-4xl font-bold tracking-tight sm:text-5xl ${brand ? "text-accent-400" : "text-brand-800"}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

/** Accreditations, memberships and awards. Hidden until entries exist. */
export async function RecognitionList() {
  const items = recognitionsFrom(await getSiteSettings());
  if (!items.length) return null;
  return (
    <section id="recognition" aria-labelledby="recognition-heading" className="scroll-mt-32">
      <h2 id="recognition-heading" className="text-2xl font-bold text-brand-900">
        Recognition
      </h2>
      <p className="mt-3 text-muted">Accreditations, memberships and awards that reflect our standards:</p>
      <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-accent-500">
        {items.map((r) => (
          <li key={r.name}>
            <strong className="text-brand-900">{r.name}</strong>
            {r.year && <span className="text-brand-900">, {r.year}</span>}
            {r.detail && <span className="text-muted"> — {r.detail}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
