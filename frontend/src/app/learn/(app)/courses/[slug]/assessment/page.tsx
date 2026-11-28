import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { submitAssessment } from "@/app/learn/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { percent } from "@/lib/learning";
import { requireLearner } from "@/lib/learn/session";

export const metadata = { title: "Assessment" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ score?: string; total?: string; passed?: string; mark?: string }> };

export default async function AssessmentPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const learner = await requireLearner();
  const sb = learner.supabase;
  const { data: course } = await sb.from("courses").select("id, slug, title, pass_mark").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  const { data: enrolment } = await sb.from("course_enrolments").select("id, status").eq("course_id", course.id).eq("user_id", learner.user.id).maybeSingle();
  if (!enrolment || enrolment.status === "withdrawn") notFound();

  if (sp.total) {
    const score = Number(sp.score);
    const total = Number(sp.total);
    const passed = sp.passed === "1";
    return (
      <div className="mx-auto max-w-xl text-center">
        <div role="status" className={`rounded-3xl p-8 ring-1 ${passed ? "bg-green-50 ring-green-200" : "bg-white ring-brand-100"}`}>
          <p className="text-5xl font-bold text-brand-900">{percent(score, total)}%</p>
          <p className="mt-2 text-lg">
            You answered {score} of {total} questions correctly.
          </p>
          <h1 className="mt-4 text-2xl font-bold text-brand-900">{passed ? "You passed. Congratulations!" : `Not quite: you need ${sp.mark}%.`}</h1>
          <p className="mt-2 text-muted">
            {passed ? "Your certificate is ready on the course page and in My learning." : "Have another look at the lessons, then try again. You can take it up to 5 times a day."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/learn/courses/${course.slug}${passed ? "?completed=1" : ""}`} className="inline-flex min-h-12 items-center rounded-full bg-brand-800 px-6 font-semibold text-white hover:bg-brand-700">
              {passed ? "Get my certificate" : "Back to the lessons"}
            </Link>
            {!passed && (
              <Link href={`/learn/courses/${course.slug}/assessment`} className="inline-flex min-h-12 items-center rounded-full px-6 font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">
                Try again
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (enrolment.status === "completed") redirect(`/learn/courses/${course.slug}`);
  const { data: questions, error } = await sb.rpc("course_quiz", { course: course.id });
  if (error || !questions?.length) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-4 text-sm">
        <Link href={`/learn/courses/${course.slug}`} className="font-semibold text-brand-700 underline">
          ← {course.title}
        </Link>
      </p>
      <h1 className="text-3xl font-bold text-brand-900">Assessment</h1>
      <p className="mt-1 text-muted">
        {questions.length} questions. You need {course.pass_mark}% to pass. Take your time: there&apos;s no time limit.
      </p>
      <ActionForm action={submitAssessment} submitLabel="Send my answers" pendingLabel="Marking…" className="mt-6 space-y-6">
        <input type="hidden" name="course" value={course.id} />
        <input type="hidden" name="slug" value={course.slug} />
        <input type="hidden" name="count" value={questions.length} />
        {questions.map((q, i) => (
          <fieldset key={q.id} className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
            <legend className="font-semibold text-brand-900">
              {i + 1}. {q.question}
            </legend>
            <div className="mt-3 space-y-2">
              {q.options.map((o: string, k: number) => (
                <label key={k} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-brand-100 px-4 py-2 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50">
                  <input type="radio" name={`q${i}`} value={k} required className="h-5 w-5 flex-none accent-brand-800" />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </ActionForm>
    </div>
  );
}
