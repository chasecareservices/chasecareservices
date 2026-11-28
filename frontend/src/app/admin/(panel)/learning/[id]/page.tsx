import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLesson, deleteQuestion, enrolLearner, saveLearningSettings, saveLesson, saveQuestion, setEnrolmentStatus } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { LessonFields, QuestionFields } from "@/components/admin/LessonFields";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { groupBySection, percent } from "@/lib/learning";

export const metadata = { title: "Online course" };

const SAVED: Record<string, string> = {
  settings: "Settings saved.",
  lesson: "Lesson saved.",
  "lesson-added": "Lesson added.",
  "lesson-deleted": "Lesson deleted.",
  question: "Question saved.",
  "question-added": "Question added.",
  "question-deleted": "Question deleted.",
  invited: "Enrolled. They've been emailed an invitation to set their password and start the course.",
  enrolled: "Enrolled. They already had an account, so they've been emailed that the course is ready.",
  withdrawn: "Learner withdrawn from the course.",
  reenrolled: "Learner enrolled again.",
};

export default async function LearningCourseAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const staff = await requirePermission("academy.view");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = staff.supabase;
  const [{ data: c }, { data: lessons }, { data: questions }, { data: enrolments }] = await Promise.all([
    sb.from("courses").select("id, slug, title, status, online_enabled, self_enrol, pass_mark, cpd_hours, fee_amount").eq("id", id).maybeSingle(),
    sb.from("course_lessons").select("*").eq("course_id", id).order("sort_order").order("created_at"),
    sb.from("course_quiz_questions").select("*").eq("course_id", id).order("sort_order").order("created_at"),
    sb.from("course_enrolments").select("id, user_id, status, source, enrolled_at, completed_at").eq("course_id", id).order("enrolled_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const userIds = (enrolments ?? []).map((e) => e.user_id);
  const enrolIds = (enrolments ?? []).map((e) => e.id);
  const lessonIds = (lessons ?? []).filter((l) => l.published).map((l) => l.id);
  const [{ data: people }, { data: progress }, { data: attempts }, { data: certs }] = userIds.length
    ? await Promise.all([
        sb.from("profiles").select("id, full_name").in("id", userIds),
        lessonIds.length ? sb.from("lesson_progress").select("user_id, lesson_id").in("lesson_id", lessonIds) : Promise.resolve({ data: [] as { user_id: string; lesson_id: string }[] }),
        sb.from("quiz_attempts").select("enrolment_id, score, total, passed, created_at").in("enrolment_id", enrolIds).order("created_at", { ascending: false }),
        sb.from("certificates").select("enrolment_id, number, revoked_at").in("enrolment_id", enrolIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const canEdit = staff.can("academy.edit");
  const canCreate = staff.can("academy.create");
  const canDelete = staff.can("academy.delete");

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/learning" className="text-sm font-medium text-brand-700 underline">
          ← Online learning
        </Link>
      </p>
      {saved && SAVED[saved] && <Notice>{SAVED[saved]}</Notice>}
      <PageHeader
        title={c.title}
        intro={`${(lessons ?? []).length} lessons · ${(questions ?? []).length} assessment questions · ${(enrolments ?? []).filter((e) => e.status !== "withdrawn").length} learners`}
        actions={
          c.status === "published" ? (
            <a href={`/academy/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 underline">
              View course page
            </a>
          ) : null
        }
      />

      <div className="space-y-8">
        <Card title="Settings">
          {canEdit ? (
            <ActionForm action={saveLearningSettings} submitLabel="Save settings" inline>
              <input type="hidden" name="id" value={c.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <fieldset className="space-y-2">
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="online_enabled" defaultChecked={c.online_enabled} className="h-5 w-5 accent-brand-800" />
                    <span>
                      <strong>Online course is on</strong>: enrolled learners can study it, and the lesson list shows on the course page
                    </span>
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="self_enrol" defaultChecked={c.self_enrol} className="h-5 w-5 accent-brand-800" />
                    <span>
                      <strong>Open to all learners</strong>: anyone with a learner account can start it themselves{c.fee_amount ? " (paid courses: staff enrol only)" : ""}
                    </span>
                  </label>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium text-brand-900">
                    Pass mark (%)
                    <input name="pass_mark" type="number" min={1} max={100} defaultValue={c.pass_mark} className={adminInput} />
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    CPD hours
                    <input name="cpd_hours" type="number" min={0} step="0.5" defaultValue={c.cpd_hours ?? ""} className={adminInput} />
                  </label>
                </div>
              </div>
              {c.status !== "published" && <p className="mt-3 text-sm text-amber-900">Note: the course page is {c.status}. Learners can still study it once enrolled.</p>}
            </ActionForm>
          ) : (
            <p className="text-sm">Online: {c.online_enabled ? "on" : "off"} · pass mark {c.pass_mark}%</p>
          )}
        </Card>

        <section id="lessons" className="scroll-mt-24">
          <Card title="Lessons">
            {groupBySection(lessons ?? []).map((g, gi) => (
              <div key={gi} className="mb-4">
                {g.section && <h3 className="mb-2 font-semibold text-brand-800">{g.section}</h3>}
                <ol className="space-y-2">
                  {g.lessons.map((l) => (
                    <li key={l.id} className="rounded-xl border border-gray-200">
                      <details>
                        <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
                          <span className="font-semibold text-brand-900">{l.title}</span>
                          <span className="text-xs text-muted">
                            #{l.sort_order}
                            {l.minutes ? ` · ${l.minutes} min` : ""}
                            {l.video_url ? " · video" : ""}
                            {l.resource_url ? " · handout" : ""}
                          </span>
                          {!l.published && <span className="rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-700">Hidden</span>}
                        </summary>
                        <div className="border-t border-gray-200 p-4">
                          {canEdit ? (
                            <ActionForm action={saveLesson} submitLabel="Save lesson" inline>
                              <input type="hidden" name="course" value={c.id} />
                              <input type="hidden" name="lesson" value={l.id} />
                              <LessonFields l={l} idPrefix={`l-${l.id}`} />
                            </ActionForm>
                          ) : (
                            <p className="whitespace-pre-line text-sm">{l.body}</p>
                          )}
                          {canDelete && (
                            <div className="mt-3">
                              <ActionForm action={deleteLesson} submitLabel="Delete lesson" inline secondary confirm={`Delete “${l.title}”? Learners' progress on it is lost.`}>
                                <input type="hidden" name="course" value={c.id} />
                                <input type="hidden" name="lesson" value={l.id} />
                              </ActionForm>
                            </div>
                          )}
                        </div>
                      </details>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            {!lessons?.length && <p className="mb-4 text-sm text-muted">No lessons yet.</p>}
            {canCreate && (
              <details className="mt-4 rounded-xl bg-brand-50 p-4" open={!lessons?.length}>
                <summary className="cursor-pointer font-semibold text-brand-800">Add a lesson</summary>
                <div className="mt-3">
                  <ActionForm action={saveLesson} submitLabel="Add lesson" inline>
                    <input type="hidden" name="course" value={c.id} />
                    <LessonFields idPrefix="new-lesson" l={{ section: lessons?.at(-1)?.section ?? "" }} />
                  </ActionForm>
                </div>
              </details>
            )}
          </Card>
        </section>

        <section id="assessment" className="scroll-mt-24">
          <Card title={`Assessment (pass mark ${c.pass_mark}%)`}>
            <p className="mb-4 text-sm text-muted">
              Learners take it after finishing every lesson. Without questions, finishing the last lesson completes the course. Learners never see the correct answers.
            </p>
            <ol className="space-y-2">
              {(questions ?? []).map((q, i) => (
                <li key={q.id} className="rounded-xl border border-gray-200">
                  <details>
                    <summary className="cursor-pointer px-4 py-3">
                      <span className="font-semibold text-brand-900">
                        {i + 1}. {q.question}
                      </span>
                      <span className="block text-xs text-muted">Correct: {q.options[q.correct_option]}</span>
                    </summary>
                    <div className="border-t border-gray-200 p-4">
                      {canEdit && (
                        <>
                          <ActionForm action={saveQuestion} submitLabel="Save question" inline>
                            <input type="hidden" name="course" value={c.id} />
                            <input type="hidden" name="question_id" value={q.id} />
                            <QuestionFields q={q} idPrefix={`q-${q.id}`} />
                          </ActionForm>
                          <div className="mt-3">
                            <ActionForm action={deleteQuestion} submitLabel="Delete question" inline secondary confirm="Delete this question?">
                              <input type="hidden" name="course" value={c.id} />
                              <input type="hidden" name="question_id" value={q.id} />
                            </ActionForm>
                          </div>
                        </>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ol>
            {canEdit && (
              <details className="mt-4 rounded-xl bg-brand-50 p-4">
                <summary className="cursor-pointer font-semibold text-brand-800">Add a question</summary>
                <div className="mt-3">
                  <ActionForm action={saveQuestion} submitLabel="Add question" inline>
                    <input type="hidden" name="course" value={c.id} />
                    <QuestionFields idPrefix="new-q" q={{ sort_order: (questions?.length ?? 0) + 1 }} />
                  </ActionForm>
                </div>
              </details>
            )}
          </Card>
        </section>

        <section id="learners" className="scroll-mt-24">
          <Card title="Learners">
            {canCreate && (
              <div className="mb-6 rounded-xl bg-brand-50 p-4">
                <h3 className="font-semibold text-brand-900">Enrol someone</h3>
                <p className="mb-3 text-sm text-muted">New people get an email to set their password. People who already have an account (e.g. care workers) are emailed that the course is ready.</p>
                <ActionForm action={enrolLearner} submitLabel="Enrol" pendingLabel="Enrolling…" inline>
                  <input type="hidden" name="course" value={c.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-brand-900">
                      Full name
                      <input name="full_name" required maxLength={120} className={adminInput} />
                    </label>
                    <label className="text-sm font-medium text-brand-900">
                      Email
                      <input name="email" type="email" required className={adminInput} />
                    </label>
                  </div>
                </ActionForm>
              </div>
            )}
            {enrolments?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-3">Learner</th>
                      <th scope="col" className="py-2 pr-3">Progress</th>
                      <th scope="col" className="py-2 pr-3">Assessment</th>
                      <th scope="col" className="py-2 pr-3">Status</th>
                      <th scope="col" className="py-2">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrolments.map((e) => {
                      const doneCount = (progress ?? []).filter((p) => p.user_id === e.user_id).length;
                      const last = (attempts ?? []).find((a) => a.enrolment_id === e.id);
                      const tries = (attempts ?? []).filter((a) => a.enrolment_id === e.id).length;
                      const cert = (certs ?? []).find((x) => x.enrolment_id === e.id);
                      return (
                        <tr key={e.id} className={e.status === "withdrawn" ? "text-muted" : ""}>
                          <td className="py-2 pr-3">
                            <span className="font-semibold">{people?.find((p) => p.id === e.user_id)?.full_name ?? "Learner"}</span>
                            <span className="block text-xs text-muted">
                              {e.source === "self" ? "Enrolled themselves" : "Enrolled by staff"} · {formatDateTime(e.enrolled_at)}
                            </span>
                          </td>
                          <td className="py-2 pr-3">
                            {e.status === "completed" ? "100%" : `${percent(doneCount, lessonIds.length)}% (${doneCount}/${lessonIds.length})`}
                          </td>
                          <td className="py-2 pr-3">{last ? `${percent(last.score, last.total)}% ${last.passed ? "✓" : "✗"} · ${tries} ${tries === 1 ? "try" : "tries"}` : "—"}</td>
                          <td className="py-2 pr-3">
                            {e.status === "completed" ? (
                              <>
                                Completed {e.completed_at ? formatDateTime(e.completed_at) : ""}
                                {cert && (
                                  <a href={`/learn/certificates/${cert.number}`} className="block text-xs font-semibold text-brand-700 underline">
                                    {cert.number}
                                    {cert.revoked_at ? " (revoked)" : ""}
                                  </a>
                                )}
                              </>
                            ) : e.status === "withdrawn" ? (
                              "Withdrawn"
                            ) : (
                              "Learning"
                            )}
                          </td>
                          <td className="py-2">
                            {canEdit && e.status !== "completed" && (
                              <ActionForm action={setEnrolmentStatus} submitLabel={e.status === "withdrawn" ? "Enrol again" : "Withdraw"} inline secondary>
                                <input type="hidden" name="course" value={c.id} />
                                <input type="hidden" name="enrolment" value={e.id} />
                                <input type="hidden" name="status" value={e.status === "withdrawn" ? "enrolled" : "withdrawn"} />
                              </ActionForm>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">Nobody is enrolled yet.</p>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
