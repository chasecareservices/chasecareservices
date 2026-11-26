import Link from "next/link";
import { messageOffice } from "@/app/family/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { FamilyVisitStatus } from "@/components/family/FamilyBits";
import { Mood, formatVisitDate, hhmm } from "@/components/portal/ReportBits";
import { todayInGhana } from "@/lib/care";
import { requireFamily } from "@/lib/family/session";

export const metadata = { title: "Home" };

export default async function FamilyHome({ searchParams }: { searchParams: Promise<{ client?: string; sent?: string }> }) {
  const [{ client: chosen, sent }, family] = await Promise.all([searchParams, requireFamily()]);
  const { data: links } = await family.supabase
    .from("care_family_links")
    .select("client_id, relationship, client:care_clients(id, full_name, preferred_name, area)")
    .eq("user_id", family.user.id);
  const people = (links ?? [])
    .map((l) => ({ relationship: l.relationship, ...(l.client as unknown as { id: string; full_name: string; preferred_name: string | null; area: string | null } | null) }))
    .filter((p): p is { relationship: string | null; id: string; full_name: string; preferred_name: string | null; area: string | null } => Boolean(p.id));

  if (!people.length) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-brand-100">
        <h1 className="text-2xl font-bold text-brand-900">Welcome, {family.firstName}</h1>
        <p className="mt-2 text-muted">Your account isn&apos;t linked to anyone&apos;s care yet. Please call the Chase Care office and they will set it up.</p>
      </div>
    );
  }

  const person = people.find((p) => p.id === chosen) ?? people[0];
  const name = person.preferred_name || person.full_name;
  const today = todayInGhana();
  const inTwoWeeks = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const [{ data: visits }, { data: reports }, { data: plan }] = await Promise.all([
    family.supabase.rpc("family_visits", { client: person.id, from_date: today, to_date: inTwoWeeks }),
    family.supabase.rpc("family_visit_reports", { client: person.id, max_rows: 10 }),
    family.supabase.from("care_plans").select("about_me, goals, visit_tasks, review_date").eq("client_id", person.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-brand-900">Hello, {family.firstName}</h1>
        <p className="mt-1 text-muted">
          How {name}&apos;s care is going{person.relationship ? ` · you are ${name}'s ${person.relationship.toLowerCase()}` : ""}.
        </p>
        {people.length > 1 && (
          <nav aria-label="Family members" className="mt-4 flex flex-wrap gap-2">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/family?client=${p.id}`}
                aria-current={p.id === person.id ? "page" : undefined}
                className="min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 ring-brand-200 aria-[current=page]:bg-brand-800 aria-[current=page]:text-white"
              >
                {p.preferred_name || p.full_name}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section aria-labelledby="visits-h">
        <h2 id="visits-h" className="text-xl font-bold text-brand-900">
          Visits in the next two weeks
        </h2>
        {!visits?.length ? (
          <p className="mt-3 rounded-2xl bg-white p-5 text-muted ring-1 ring-brand-100">No visits are booked yet. The office will add them here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-brand-100">
            {visits.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="block font-semibold text-brand-900">
                    {v.shift_date === today ? "Today" : formatVisitDate(v.shift_date)}, {hhmm(v.start_time)}–{hhmm(v.end_time)}
                  </span>
                  <span className="block text-sm text-muted">With {v.worker_first_name}</span>
                </span>
                <FamilyVisitStatus status={v.visit_status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reports-h">
        <h2 id="reports-h" className="text-xl font-bold text-brand-900">
          Latest visit reports
        </h2>
        <p className="mt-1 text-sm text-muted">Reports appear here once the office has read them.</p>
        {!reports?.length ? (
          <p className="mt-3 rounded-2xl bg-white p-5 text-muted ring-1 ring-brand-100">No reports to show yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/family/report/${r.id}?client=${person.id}`} className="block rounded-2xl bg-white p-4 ring-1 ring-brand-100 hover:ring-brand-300">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-brand-900">
                      {formatVisitDate(r.visit_date)} · with {r.worker_first_name}
                    </span>
                    <Mood mood={r.mood} />
                  </span>
                  <span className="mt-1 line-clamp-2 block text-ink">{r.summary}</span>
                  <span className="mt-1 block text-sm font-semibold text-brand-700 underline">Read the full report</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {plan && (plan.about_me || plan.goals.length || plan.visit_tasks.length) ? (
        <section aria-labelledby="plan-h" className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
          <h2 id="plan-h" className="text-xl font-bold text-brand-900">
            {name}&apos;s care plan
          </h2>
          {plan.about_me && <p className="mt-2 whitespace-pre-line">{plan.about_me}</p>}
          {plan.goals.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold text-brand-900">What we are working towards</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {plan.goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </>
          )}
          {plan.visit_tasks.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold text-brand-900">What happens on each visit</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {plan.visit_tasks.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          {plan.review_date && <p className="mt-4 text-sm text-muted">Next review: {formatVisitDate(plan.review_date)}. Tell us anything you&apos;d like changed.</p>}
        </section>
      ) : null}

      <section id="message" aria-labelledby="message-h" className="scroll-mt-24 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <h2 id="message-h" className="text-xl font-bold text-brand-900">
          Message the office
        </h2>
        {sent && (
          <p role="status" className="mt-2 rounded-xl bg-green-50 p-3 text-green-900 ring-1 ring-green-200">
            ✓ Message sent. The office will get back to you, usually within one working day.
          </p>
        )}
        <p className="mt-1 text-sm text-muted">A question, a change of plans, or anything we should know. For anything urgent, please call.</p>
        <ActionForm action={messageOffice} submitLabel="Send message" pendingLabel="Sending…" className="mt-3">
          <input type="hidden" name="client_id" value={person.id} />
          <label htmlFor="message-text" className="sr-only">
            Your message
          </label>
          <textarea
            id="message-text"
            name="message"
            required
            maxLength={2000}
            rows={4}
            placeholder={`e.g. ${name} has a doctor's appointment on Friday at 10 am.`}
            className="block w-full rounded-xl border-2 border-brand-200 bg-white px-3 py-2 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </ActionForm>
      </section>
    </div>
  );
}
