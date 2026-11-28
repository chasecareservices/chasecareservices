import Link from "next/link";
import { notFound } from "next/navigation";
import { CERT_TYPE_LABEL, formatHours, groupBySection, nextLesson, percent } from "@/lib/learning";
import { requireLearner } from "@/lib/learn/session";

export const metadata = { title: "Course" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ completed?: string; enrolled?: string; lessons?: string }> };

export default async function LearnCourse({ params, searchParams }: Props) {
  const { slug } = await params;
  const { completed, enrolled, lessons: lessonsDone } = await searchParams;
  const learner = await requireLearner();
  const sb = learner.supabase;
  const { data: course } = await sb.from("courses").select("id, slug, title, summary, cpd_hours, pass_mark, certification_type").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  const { data: enrolment } = await sb.from("course_enrolments").select("id, status").eq("course_id", course.id).eq("user_id", learner.user.id).maybeSingle();
  if (!enrolment || enrolment.status === "withdrawn") notFound();
  const [{ data: lessons }, { data: progress }, { data: quiz }, { data: cert }, { data: attempts }] = await Promise.all([
    sb.from("course_lessons").select("id, section, title, minutes").eq("course_id", course.id).order("sort_order").order("created_at"),
    sb.from("lesson_progress").select("lesson_id").eq("user_id", learner.user.id),
    sb.rpc("course_quiz", { course: course.id }),
    sb.from("certificates").select("number, revoked_at").eq("enrolment_id", enrolment.id).maybeSingle(),
    sb.from("quiz_attempts").select("score, total, passed, created_at").eq("enrolment_id", enrolment.id).order("created_at", { ascending: false }).limit(1),
  ]);
  const list = lessons ?? [];
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const doneCount = list.filter((l) => done.has(l.id)).length;
  const next = nextLesson(list, done);
  const hasQuiz = (quiz ?? []).length > 0;
  const isComplete = enrolment.status === "completed";
  const last = attempts?.[0];

  return (
    <div>
      <p className="mb-4">
        <Link href="/learn" className="text-sm font-semibold text-brand-700 underline">
          ← My learning
        </Link>
      </p>
      {(completed || (isComplete && cert)) && (
        <div role="status" className="mb-6 rounded-2xl bg-green-50 p-5 text-green-950 ring-1 ring-green-200">
          <p className="text-lg font-bold">🎉 Course complete. Well done, {learner.firstName}!</p>
          {cert && !cert.revoked_at && (
            <a href={`/learn/certificates/${cert.number}`} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 font-semibold text-white hover:bg-brand-700">
              Download your certificate (PDF)
            </a>
          )}
        </div>
      )}
      {enrolled && <p role="status" className="mb-6 rounded-2xl bg-brand-50 p-4 font-semibold text-brand-900 ring-1 ring-brand-200">You&apos;re enrolled. Start with the first lesson below.</p>}
      {lessonsDone && hasQuiz && !isComplete && (
        <p role="status" className="mb-6 rounded-2xl bg-accent-50 p-4 font-semibold text-ink ring-1 ring-accent-200">
          You&apos;ve finished every lesson. Now take the assessment.
        </p>
      )}

      <h1 className="text-3xl font-bold text-brand-900">{course.title}</h1>
      {course.summary && <p className="mt-2 max-w-3xl text-lg">{course.summary}</p>}
      <p className="mt-2 text-sm text-muted">
        {CERT_TYPE_LABEL[course.certification_type]}
        {course.cpd_hours ? ` · ${formatHours(Number(course.cpd_hours))} CPD` : ""}
        {hasQuiz ? ` · Assessment pass mark ${course.pass_mark}%` : ""}
      </p>

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-56 flex-1">
            <p className="font-semibold text-brand-900">
              {doneCount} of {list.length} lessons done
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={percent(doneCount, list.length)} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
              <div className="h-full rounded-full bg-accent-500" style={{ width: `${percent(doneCount, list.length)}%` }} />
            </div>
          </div>
          {next ? (
            <Link href={`/learn/courses/${course.slug}/lessons/${next.id}`} className="inline-flex min-h-12 items-center rounded-full bg-accent-500 px-6 font-semibold text-brand-950 hover:bg-accent-400">
              {doneCount ? "Continue" : "Start the course"}
            </Link>
          ) : hasQuiz && !isComplete ? (
            <Link href={`/learn/courses/${course.slug}/assessment`} className="inline-flex min-h-12 items-center rounded-full bg-accent-500 px-6 font-semibold text-brand-950 hover:bg-accent-400">
              Take the assessment
            </Link>
          ) : null}
        </div>
        {last && !isComplete && (
          <p className="mt-3 text-sm text-muted">
            Last assessment: {last.score} of {last.total} ({percent(last.score, last.total)}%). You need {course.pass_mark}%.
          </p>
        )}
      </div>

      <section aria-labelledby="lessons-h" className="mt-8">
        <h2 id="lessons-h" className="text-2xl font-bold text-brand-900">Lessons</h2>
        {groupBySection(list).map((g, gi) => (
          <div key={gi} className="mt-5">
            {g.section && <h3 className="mb-2 font-semibold text-brand-800">{g.section}</h3>}
            <ol className="divide-y divide-brand-100 rounded-2xl bg-white ring-1 ring-brand-100">
              {g.lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/learn/courses/${course.slug}/lessons/${l.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-brand-50">
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${done.has(l.id) ? "bg-green-600 text-white" : "bg-brand-100 text-brand-800"}`}
                    >
                      {done.has(l.id) ? "✓" : list.indexOf(l) + 1}
                    </span>
                    <span className="flex-1 font-medium text-brand-900">
                      {l.title}
                      <span className="sr-only">{done.has(l.id) ? " (done)" : ""}</span>
                    </span>
                    {l.minutes && <span className="text-sm text-muted">{l.minutes} min</span>}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
        {hasQuiz && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-brand-100">
            <span className="font-medium text-brand-900">
              Assessment · {(quiz ?? []).length} questions {isComplete ? "· passed ✓" : ""}
            </span>
            {!next && !isComplete && (
              <Link href={`/learn/courses/${course.slug}/assessment`} className="font-semibold text-brand-700 underline">
                Start
              </Link>
            )}
            {next && <span className="text-sm text-muted">After the lessons</span>}
          </div>
        )}
      </section>
    </div>
  );
}
