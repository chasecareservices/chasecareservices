import { adminInput } from "@/components/admin/ui";

type Lesson = {
  section?: string | null;
  title?: string;
  body?: string | null;
  video_url?: string | null;
  resource_url?: string | null;
  resource_label?: string | null;
  minutes?: number | null;
  sort_order?: number;
  published?: boolean;
};
const label = "block text-sm font-medium text-brand-900";

export function LessonFields({ l = {}, idPrefix }: { l?: Lesson; idPrefix: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className={label}>
        Title
        <input name="title" required maxLength={200} defaultValue={l.title ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Module / section (optional)
        <input name="section" maxLength={120} defaultValue={l.section ?? ""} placeholder="e.g. Module 1: Understanding dementia" className={adminInput} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Lesson text
        <span className="block text-xs font-normal text-muted">Leave a blank line between paragraphs.</span>
        <textarea name="body" rows={8} maxLength={30000} defaultValue={l.body ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Video link (optional)
        <span className="block text-xs font-normal text-muted">YouTube or Vimeo: it plays inside the lesson.</span>
        <input name="video_url" type="url" maxLength={500} defaultValue={l.video_url ?? ""} placeholder="https://www.youtube.com/watch?v=…" className={adminInput} />
      </label>
      <label className={label}>
        Handout link (optional)
        <span className="block text-xs font-normal text-muted">A PDF or page, e.g. shared from Google Drive.</span>
        <input name="resource_url" type="url" maxLength={500} defaultValue={l.resource_url ?? ""} placeholder="https://…" className={adminInput} />
      </label>
      <label className={label}>
        Handout button text
        <input name="resource_label" maxLength={120} defaultValue={l.resource_label ?? ""} placeholder="Download the handout" className={adminInput} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Minutes
          <input name="minutes" type="number" min={1} max={600} defaultValue={l.minutes ?? ""} className={adminInput} />
        </label>
        <label className={label}>
          Order
          <input name="sort_order" type="number" defaultValue={l.sort_order ?? ""} className={adminInput} />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm md:col-span-2" htmlFor={`${idPrefix}-pub`}>
        <input id={`${idPrefix}-pub`} type="checkbox" name="published" defaultChecked={l.published ?? true} className="h-5 w-5 accent-brand-800" />
        Show this lesson to learners
      </label>
    </div>
  );
}

type Question = { question?: string; options?: string[]; correct_option?: number; explanation?: string | null; sort_order?: number };

export function QuestionFields({ q = {}, idPrefix }: { q?: Question; idPrefix: string }) {
  const opts = [...(q.options ?? []), "", "", "", "", "", ""].slice(0, 6);
  return (
    <div className="space-y-3">
      <label className={label}>
        Question
        <textarea name="question" rows={2} required maxLength={1000} defaultValue={q.question ?? ""} className={adminInput} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-brand-900">Answers: fill in 2 to 6, and tick the correct one</legend>
        <div className="mt-2 space-y-2">
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct"
                value={i}
                defaultChecked={q.correct_option === i}
                aria-label={`Answer ${i + 1} is correct`}
                id={`${idPrefix}-c${i}`}
                className="h-5 w-5 flex-none accent-brand-800"
              />
              <label htmlFor={`${idPrefix}-o${i}`} className="sr-only">
                Answer {i + 1}
              </label>
              <input id={`${idPrefix}-o${i}`} name={`option_${i}`} maxLength={300} defaultValue={o} placeholder={`Answer ${i + 1}${i < 2 ? "" : " (optional)"}`} className={`${adminInput} mt-0`} />
            </div>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className={label}>
          Explanation (optional, for your team)
          <input name="explanation" maxLength={1000} defaultValue={q.explanation ?? ""} className={adminInput} />
        </label>
        <label className={label}>
          Order
          <input name="sort_order" type="number" defaultValue={q.sort_order ?? 0} className={adminInput} />
        </label>
      </div>
    </div>
  );
}
