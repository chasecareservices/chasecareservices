import Link from "next/link";
import { enrolMyself } from "@/app/learn/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { CERT_TYPE_LABEL, formatHours, percent } from "@/lib/learning";
import { requireLearner } from "@/lib/learn/session";

export const metadata = { title: "My learning" };

export default async function LearnHome() {
  const learner = await requireLearner();
  const sb = learner.supabase;
  const [{ data: enrolments }, { data: certs }, { data: open }] = await Promise.all([
    sb.from("course_enrolments").select("id, status, completed_at, course:courses(id, slug, title, summary, cpd_hours)").eq("user_id", learner.user.id).neq("status", "withdrawn"),
    sb.from("certificates").select("number, course_title, certification_type, cpd_hours, completed_on, revoked_at").eq("user_id", learner.user.id).order("completed_on", { ascending: false }),
    sb.from("courses").select("id, slug, title, summary, cpd_hours, duration_text").eq("status", "published").eq("online_enabled", true).eq("self_enrol", true).order("sort_order"),
  ]);
  type C = { id: string; slug: string; title: string; summary: string | null; cpd_hours: number | null };
  const mine = (enrolments ?? []).map((e) => ({ ...e, course: e.course as unknown as C })).filter((e) => e.course);
  const courseIds = mine.map((e) => e.course.id);
  const [{ data: lessons }, { data: progress }] = courseIds.length
    ? await Promise.all([
        sb.from("course_lessons").select("id, course_id").in("course_id", courseIds),
        sb.from("lesson_progress").select("lesson_id").eq("user_id", learner.user.id),
      ])
    : [{ data: [] }, { data: [] }];
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const stat = (cid: string) => {
    const ls = (lessons ?? []).filter((l) => l.course_id === cid);
    return { total: ls.length, done: ls.filter((l) => done.has(l.id)).length };
  };
  const valid = (certs ?? []).filter((c) => !c.revoked_at);
  const cpd = valid.reduce((s, c) => s + Number(c.cpd_hours ?? 0), 0);
  const available = (open ?? []).filter((c) => !courseIds.includes(c.id));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-brand-900">Welcome, {learner.firstName}</h1>
        <p className="mt-1 text-muted">Your ChaseCare Academy courses and certificates.</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          ["Courses in progress", String(mine.filter((m) => m.status === "enrolled").length)],
          ["Certificates", String(valid.length)],
          ["CPD hours", cpd ? formatHours(cpd) : "0"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
            <dt className="text-sm font-semibold text-muted">{k}</dt>
            <dd className="mt-1 text-3xl font-bold text-brand-900">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="mine-h">
        <h2 id="mine-h" className="text-2xl font-bold text-brand-900">My courses</h2>
        {mine.length ? (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {mine.map((e) => {
              const s = stat(e.course.id);
              const pct = e.status === "completed" ? 100 : percent(s.done, s.total);
              return (
                <li key={e.id} className="relative rounded-2xl bg-white p-5 ring-1 ring-brand-100 hover:ring-brand-400">
                  <h3 className="text-lg font-bold text-brand-900">
                    <Link href={`/learn/courses/${e.course.slug}`} className="after:absolute after:inset-0">
                      {e.course.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted">
                    {e.status === "completed" ? "Completed ✓" : `${s.done} of ${s.total} lessons done`}
                    {e.course.cpd_hours ? ` · ${formatHours(Number(e.course.cpd_hours))} CPD` : ""}
                  </p>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${e.course.title} progress`}>
                    <div className={`h-full rounded-full ${e.status === "completed" ? "bg-green-600" : "bg-accent-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-brand-700">{e.status === "completed" ? "Review the course" : s.done ? "Continue" : "Start"} →</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl bg-white p-6 text-muted ring-1 ring-brand-100">You aren&apos;t enrolled on a course yet.{available.length ? " Choose one below." : " The Academy will enrol you."}</p>
        )}
      </section>

      {available.length > 0 && (
        <section aria-labelledby="open-h">
          <h2 id="open-h" className="text-2xl font-bold text-brand-900">Free courses you can start now</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {available.map((c) => (
              <li key={c.id} className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-brand-100">
                <h3 className="text-lg font-bold text-brand-900">{c.title}</h3>
                {c.summary && <p className="mt-1 text-sm">{c.summary}</p>}
                <p className="mt-1 text-sm text-muted">{[c.duration_text, c.cpd_hours ? `${formatHours(Number(c.cpd_hours))} CPD` : null].filter(Boolean).join(" · ")}</p>
                <div className="mt-auto pt-4">
                  <ActionForm action={enrolMyself} submitLabel="Start this course" pendingLabel="Enrolling…" inline>
                    <input type="hidden" name="course" value={c.id} />
                    <input type="hidden" name="slug" value={c.slug} />
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="certs-h">
        <h2 id="certs-h" className="text-2xl font-bold text-brand-900">My certificates</h2>
        {certs?.length ? (
          <ul className="mt-4 divide-y divide-brand-100 rounded-2xl bg-white ring-1 ring-brand-100">
            {certs.map((c) => (
              <li key={c.number} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <span className="block font-semibold text-brand-900">{c.course_title}</span>
                  <span className="block text-sm text-muted">
                    {CERT_TYPE_LABEL[c.certification_type]} · {c.number} · {new Date(`${c.completed_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                    {c.cpd_hours ? ` · ${formatHours(Number(c.cpd_hours))} CPD` : ""}
                  </span>
                </span>
                {c.revoked_at ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-900">Revoked</span>
                ) : (
                  <a href={`/learn/certificates/${c.number}`} className="inline-flex min-h-11 items-center rounded-full bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                    Download PDF<span className="sr-only">: {c.course_title}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">Certificates appear here when you complete a course.</p>
        )}
      </section>
    </div>
  );
}
