import Link from "next/link";
import { notFound } from "next/navigation";
import { addEnquiryNote, updateEnquiryStatus } from "../actions";
import { Card, Notice, PageHeader, StatusBadge, STATUS_LABELS, adminButton, adminButtonSecondary, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { CONTACT_TOPICS } from "@/lib/enquiry-topics";
import { phoneDigits, whatsappLink } from "@/lib/format";

export const metadata = { title: "Enquiry" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

/** Turns form field names such as "who_needs_care" into "Who needs care". */
const labelFor = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v));

export default async function EnquiryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const staff = await requirePermission("enquiries.view");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [{ data: e }, { data: notes }] = await Promise.all([
    staff.supabase.from("enquiries").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("enquiry_notes").select("id, body, created_at, author_id").eq("enquiry_id", id).order("created_at"),
  ]);
  if (!e) notFound();

  const authorIds = [...new Set((notes ?? []).map((n) => n.author_id).filter(Boolean))] as string[];
  const { data: authors } = authorIds.length
    ? await staff.supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorName = (aid: string | null) => authors?.find((a) => a.id === aid)?.full_name ?? "Staff member";

  const canEdit = staff.can("enquiries.edit");
  const payload = (e.payload && typeof e.payload === "object" && !Array.isArray(e.payload) ? e.payload : {}) as Record<string, unknown>;
  const details = Object.entries(payload).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  const topic = CONTACT_TOPICS.find((t) => t.value === e.enquiry_type)?.label ?? e.enquiry_type;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/enquiries" className="text-sm font-medium text-brand-700 underline">
          ← All enquiries
        </Link>
      </p>
      {saved && <Notice>{saved === "note" ? "Note added." : "Status updated."}</Notice>}
      {error && <Notice tone="error">Something went wrong saving that. Please try again.</Notice>}
      <PageHeader title={e.full_name} intro={`${topic} · received ${formatDateTime(e.created_at)}`} actions={<StatusBadge status={e.status} />} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Message">
            {e.subject && <p className="mb-2 font-semibold text-brand-900">{e.subject}</p>}
            <p className="whitespace-pre-wrap">{e.message || <span className="text-muted">No message.</span>}</p>
          </Card>

          {details.length > 0 && (
            <Card title="Form details">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{labelFor(k)}</dt>
                    <dd className="text-ink">{show(v)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          <Card title="Internal notes">
            <div id="notes" className="scroll-mt-24" />
            {(notes ?? []).length === 0 ? (
              <p className="text-muted">No notes yet. Notes are only visible to staff.</p>
            ) : (
              <ol className="space-y-4">
                {(notes ?? []).map((n) => (
                  <li key={n.id} className="rounded-xl bg-gray-50 p-4">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-2 text-xs text-muted">
                      {authorName(n.author_id)} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {canEdit && (
              <form action={addEnquiryNote} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={e.id} />
                <label className="block text-sm font-medium text-brand-900">
                  Add a note
                  <textarea name="body" required rows={3} maxLength={5000} className={adminInput} placeholder="e.g. Called back, consultation booked for Monday" />
                </label>
                <button type="submit" className={adminButton}>
                  Add note
                </button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Contact">
            <dl className="space-y-3 text-sm">
              {e.email && (
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd>
                    <a href={`mailto:${e.email}`} className="font-medium text-brand-700 underline">
                      {e.email}
                    </a>
                  </dd>
                </div>
              )}
              {e.phone && (
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="flex flex-wrap gap-3">
                    <a href={`tel:${phoneDigits(e.phone)}`} className="font-medium text-brand-700 underline">
                      {e.phone}
                    </a>
                    <a href={whatsappLink(e.phone)} target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 underline">
                      WhatsApp
                    </a>
                  </dd>
                </div>
              )}
              {e.country && (
                <div>
                  <dt className="text-muted">Country</dt>
                  <dd>{e.country}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Sent from page</dt>
                <dd>{e.source_page ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Consent given</dt>
                <dd>{e.consent_given ? `Yes (${e.consent_version})` : "No"}</dd>
              </div>
            </dl>
          </Card>

          {canEdit && (
            <Card title="Status">
              <form action={updateEnquiryStatus} className="space-y-3">
                <input type="hidden" name="id" value={e.id} />
                <label className="block text-sm font-medium text-brand-900">
                  Change status
                  <select name="status" defaultValue={e.status} className={adminInput}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={adminButtonSecondary}>
                  Save status
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
