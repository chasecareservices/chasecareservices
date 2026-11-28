import Link from "next/link";
import { notFound } from "next/navigation";
import { finishLesson } from "@/app/learn/actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { videoEmbedUrl } from "@/lib/learning";
import { requireLearner } from "@/lib/learn/session";

export const metadata = { title: "Lesson" };

export default async function LessonPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const learner = await requireLearner();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = learner.supabase;
  const { data: course } = await sb.from("courses").select("id, slug, title").eq("slug", slug).maybeSingle();
  if (!course) notFound();
  const [{ data: lessons }, { data: progress }] = await Promise.all([
    sb.from("course_lessons").select("id, section, title, body, video_url, resource_url, resource_label, minutes").eq("course_id", course.id).order("sort_order").order("created_at"),
    sb.from("lesson_progress").select("lesson_id").eq("user_id", learner.user.id),
  ]);
  const list = lessons ?? [];
  const i = list.findIndex((l) => l.id === id);
  if (i < 0) notFound();
  const lesson = list[i];
  const next = list[i + 1];
  const prev = list[i - 1];
  const done = new Set((progress ?? []).map((p) => p.lesson_id));
  const video = videoEmbedUrl(lesson.video_url);

  return (
    <article>
      <p className="mb-4 text-sm">
        <Link href={`/learn/courses/${course.slug}`} className="font-semibold text-brand-700 underline">
          ← {course.title}
        </Link>
      </p>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">
        Lesson {i + 1} of {list.length}
        {lesson.section ? ` · ${lesson.section}` : ""}
      </p>
      <h1 className="mt-1 text-3xl font-bold text-brand-900">{lesson.title}</h1>
      {lesson.minutes && <p className="text-sm text-muted">About {lesson.minutes} minutes</p>}

      {video && (
        <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            src={video}
            title={`Video: ${lesson.title}`}
            className="h-full w-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      {lesson.video_url && !video && (
        <p className="mt-6">
          <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
            Watch the video<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}

      <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed">
        {(lesson.body ?? "")
          .split(/\n\s*\n/)
          .filter((p) => p.trim())
          .map((p, k) => (
            <p key={k} className="whitespace-pre-line">
              {p.trim()}
            </p>
          ))}
      </div>

      {lesson.resource_url && (
        <p className="mt-6">
          <a href={lesson.resource_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">
            {lesson.resource_label || "Open the handout"}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-brand-100 pt-6">
        {prev ? (
          <Link href={`/learn/courses/${course.slug}/lessons/${prev.id}`} className="font-semibold text-brand-700 underline">
            ← Previous lesson
          </Link>
        ) : (
          <span />
        )}
        <ActionForm action={finishLesson} submitLabel={next ? (done.has(lesson.id) ? "Next lesson →" : "Finished: next lesson →") : "Finish the last lesson"} pendingLabel="Saving…" inline>
          <input type="hidden" name="lesson" value={lesson.id} />
          <input type="hidden" name="slug" value={course.slug} />
          <input type="hidden" name="next" value={next?.id ?? ""} />
        </ActionForm>
      </div>
    </article>
  );
}
