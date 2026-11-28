type A = { id: string; title: string; body: string; important: boolean; publish_at: string };

/** Announcements from the office, newest first; important ones highlighted. Shown in the worker and family portals. */
export function AnnouncementList({ items }: { items: A[] }) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => Number(b.important) - Number(a.important) || b.publish_at.localeCompare(a.publish_at));
  return (
    <section aria-labelledby="news-h" className="space-y-3">
      <h2 id="news-h" className="text-lg font-bold text-brand-900">
        From the office
      </h2>
      {sorted.map((a) => (
        <details key={a.id} open={a.important} className={`rounded-2xl p-4 ring-1 ${a.important ? "bg-accent-50 ring-accent-300" : "bg-white ring-brand-100"}`}>
          <summary className="cursor-pointer font-semibold text-brand-900">
            {a.important && <span className="mr-2 rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-brand-950">Important</span>}
            {a.title}
            <span className="ml-2 text-xs font-normal text-muted">{new Date(a.publish_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
          </summary>
          <div className="mt-2 space-y-2 text-sm">
            {a.body.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
