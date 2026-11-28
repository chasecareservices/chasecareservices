import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Online learning" };

export default async function LearningAdmin() {
  const staff = await requirePermission("academy.view");
  const sb = staff.supabase;
  const [{ data: courses }, { data: lessons }, { data: questions }, { data: enrolments }] = await Promise.all([
    sb.from("courses").select("id, title, status, online_enabled, self_enrol, cpd_hours").order("online_enabled", { ascending: false }).order("sort_order"),
    sb.from("course_lessons").select("course_id"),
    sb.from("course_quiz_questions").select("course_id"),
    sb.from("course_enrolments").select("course_id, status"),
  ]);
  const n = (rows: { course_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.course_id === id).length;
  const e = (id: string, s: string) => (enrolments ?? []).filter((r) => r.course_id === id && r.status === s).length;

  return (
    <>
      <PageHeader
        title="Online learning"
        intro="Turn any Academy course into an online course: add lessons and an assessment, enrol learners, and certificates are issued automatically when they pass."
        actions={
          <Link href="/admin/learning/certificates" className="inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
            Certificates
          </Link>
        }
      />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Course</th>
              <th scope="col" className="px-4 py-3">Online</th>
              <th scope="col" className="px-4 py-3">Lessons</th>
              <th scope="col" className="px-4 py-3">Questions</th>
              <th scope="col" className="px-4 py-3">Learning now</th>
              <th scope="col" className="px-4 py-3">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(courses ?? []).map((c) => (
              <tr key={c.id} className="relative hover:bg-brand-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/learning/${c.id}`} className="font-semibold text-brand-800 underline after:absolute after:inset-0">
                    {c.title}
                  </Link>
                  {c.status !== "published" && <span className="block text-xs text-muted">Course page is {c.status}</span>}
                </td>
                <td className="px-4 py-3">
                  {c.online_enabled ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">On{c.self_enrol ? " · open" : ""}</span>
                  ) : (
                    <span className="text-muted">Off</span>
                  )}
                </td>
                <td className="px-4 py-3">{n(lessons, c.id)}</td>
                <td className="px-4 py-3">{n(questions, c.id)}</td>
                <td className="px-4 py-3">{e(c.id, "enrolled")}</td>
                <td className="px-4 py-3">{e(c.id, "completed")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">
        To add a new course, use{" "}
        <Link href="/admin/content/courses" className="font-semibold text-brand-700 underline">
          Courses
        </Link>{" "}
        first, then come back here to put it online.
      </p>
    </>
  );
}
