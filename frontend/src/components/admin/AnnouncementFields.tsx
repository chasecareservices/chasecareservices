import { adminInput } from "@/components/admin/ui";
import { toLocalInput } from "@/lib/admin/values";

type A = { title?: string; body?: string; audience?: string; important?: boolean; publish_at?: string; expires_at?: string | null; status?: string };
const label = "block text-sm font-medium text-brand-900";

export function AnnouncementFields({ a = {} }: { a?: A }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className={`${label} md:col-span-2`}>
        Title
        <input name="title" required maxLength={150} defaultValue={a.title ?? ""} className={adminInput} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Message
        <span className="block text-xs font-normal text-muted">Leave a blank line between paragraphs. Don&apos;t include anyone&apos;s health details.</span>
        <textarea name="body" required rows={6} maxLength={5000} defaultValue={a.body ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Who is it for?
        <select name="audience" defaultValue={a.audience ?? "workers"} className={adminInput}>
          <option value="workers">Care workers</option>
          <option value="families">Families</option>
          <option value="both">Care workers and families</option>
        </select>
      </label>
      <label className={label}>
        Status
        <select name="status" defaultValue={a.status ?? "draft"} className={adminInput}>
          <option value="draft">Draft (not shown)</option>
          <option value="published">Published</option>
        </select>
      </label>
      <label className={label}>
        Show from (optional)
        <input name="publish_at" type="datetime-local" defaultValue={toLocalInput(a.publish_at)} className={adminInput} />
      </label>
      <label className={label}>
        Show until (optional)
        <input name="expires_at" type="datetime-local" defaultValue={toLocalInput(a.expires_at)} className={adminInput} />
      </label>
      <label className="flex items-center gap-3 text-sm md:col-span-2">
        <input type="checkbox" name="important" defaultChecked={a.important ?? false} className="h-5 w-5 accent-brand-800" />
        Important: show it highlighted at the top of the portal
      </label>
    </div>
  );
}
