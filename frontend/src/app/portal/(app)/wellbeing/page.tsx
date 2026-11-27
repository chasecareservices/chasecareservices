import Link from "next/link";
import { ResourceList, ServiceCards, UpcomingSessions } from "@/components/wellbeing/WellbeingLists";
import { requireWorker } from "@/lib/portal/session";
import { SUPPORT_KINDS, kindShort, splitResources, statusLabel } from "@/lib/wellbeing";

export const metadata = { title: "Wellbeing Hub" };

const SERVICE_FIELDS = "id, name, kind, provider, description, benefit, how_to_access, location, phone, website_url";

export default async function PortalWellbeing() {
  const worker = await requireWorker();
  const [{ data: requests }, { data: services }, { data: resources }] = await Promise.all([
    worker.supabase.from("wellbeing_requests").select("id, reference, kind, status, created_at, updated_at").eq("worker_id", worker.user.id).order("updated_at", { ascending: false }).limit(20),
    worker.supabase.from("wellbeing_services").select(SERVICE_FIELDS).eq("status", "published").order("sort_order"),
    worker.supabase.from("wellbeing_resources").select("id, title, kind, summary, url, starts_at, place").eq("status", "published").order("sort_order"),
  ]);
  const { upcoming, library } = splitResources(resources ?? []);
  const insurance = (services ?? []).filter((s) => s.kind === "insurance");
  const other = (services ?? []).filter((s) => s.kind !== "insurance");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-900">Wellbeing Hub</h1>
        <p className="mt-1 text-muted">Caring for others is demanding, {worker.firstName}. We&apos;re here for you too.</p>
      </div>

      <section aria-labelledby="ask-h" className="rounded-2xl bg-brand-800 p-5 text-white">
        <h2 id="ask-h" className="text-xl font-bold">Need to talk, or need help?</h2>
        <p className="mt-1 text-brand-50">Ask the wellbeing team in confidence. Only they will read it.</p>
        <Link href="/portal/wellbeing/ask" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-accent-500 px-6 font-semibold text-brand-950 hover:bg-accent-400">
          Ask for support
        </Link>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {SUPPORT_KINDS.filter((k) => k.value !== "other").map((k) => (
            <li key={k.value}>
              <Link href={`/portal/wellbeing/ask?kind=${k.value}`} className="inline-flex min-h-10 items-center rounded-full bg-white/10 px-3 hover:bg-white/20">
                {k.short}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {!!requests?.length && (
        <section aria-labelledby="mine-h">
          <h2 id="mine-h" className="text-xl font-bold text-brand-900">Your requests</h2>
          <ul className="mt-3 space-y-2">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/portal/wellbeing/${r.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-brand-100 hover:ring-brand-400">
                  <span>
                    <span className="block font-semibold text-brand-900">{kindShort(r.kind)}</span>
                    <span className="block text-sm text-muted">
                      {r.reference} · {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
                    </span>
                  </span>
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-900">{statusLabel(r.status)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="up-h">
          <h2 id="up-h" className="text-xl font-bold text-brand-900">Coming up</h2>
          <div className="mt-3">
            <UpcomingSessions rows={upcoming} />
          </div>
        </section>
      )}

      {other.length > 0 && (
        <section aria-labelledby="svc-h">
          <h2 id="svc-h" className="text-xl font-bold text-brand-900">Services for you</h2>
          <div className="mt-3">
            <ServiceCards services={other} />
          </div>
        </section>
      )}

      {insurance.length > 0 && (
        <section aria-labelledby="ins-h">
          <h2 id="ins-h" className="text-xl font-bold text-brand-900">Your insurance & benefits</h2>
          <div className="mt-3">
            <ServiceCards services={insurance} />
          </div>
        </section>
      )}

      {library.length > 0 && (
        <section aria-labelledby="res-h">
          <h2 id="res-h" className="text-xl font-bold text-brand-900">Health education & resources</h2>
          <div className="mt-3">
            <ResourceList rows={library} />
          </div>
        </section>
      )}
    </div>
  );
}
