import { adminInput } from "@/components/admin/ui";

type P = { title?: string; category?: string | null; summary?: string | null; body?: string | null; document_url?: string | null; must_read?: boolean; status?: string; sort_order?: number; version?: number };
const label = "block text-sm font-medium text-brand-900";

export function PolicyFields({ p = {}, existing = false }: { p?: P; existing?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className={label}>
        Title
        <input name="title" required maxLength={200} defaultValue={p.title ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Category
        <input name="category" maxLength={80} defaultValue={p.category ?? ""} placeholder="e.g. Safeguarding, Health & safety" className={adminInput} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Summary
        <textarea name="summary" rows={2} maxLength={600} defaultValue={p.summary ?? ""} className={adminInput} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Policy text
        <span className="block text-xs font-normal text-muted">Leave a blank line between paragraphs. Or link the full document below.</span>
        <textarea name="body" rows={12} maxLength={60000} defaultValue={p.body ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Full document link (optional)
        <input name="document_url" type="url" maxLength={500} defaultValue={p.document_url ?? ""} placeholder="https://… (e.g. a PDF on Google Drive)" className={adminInput} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Status
          <select name="status" defaultValue={p.status ?? "draft"} className={adminInput}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className={label}>
          Order
          <input name="sort_order" type="number" defaultValue={p.sort_order ?? 0} className={adminInput} />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm md:col-span-2">
        <input type="checkbox" name="must_read" defaultChecked={p.must_read ?? true} className="h-5 w-5 accent-brand-800" />
        Care workers must confirm they have read and understood it
      </label>
      {existing && p.status === "published" && (
        <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm md:col-span-2">
          <input type="checkbox" name="new_version" className="mt-0.5 h-5 w-5 accent-brand-800" />
          <span>
            <strong>This is an important change: make it version {(p.version ?? 1) + 1}</strong>. Everyone will be asked to read it again. Leave unticked for small corrections.
          </span>
        </label>
      )}
    </div>
  );
}
