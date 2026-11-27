import Link from "next/link";
import { notFound } from "next/navigation";
import { addWellbeingMessage, updateWellbeingRequest } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { phoneDigits, whatsappLink } from "@/lib/format";
import { REQUEST_STATUS, contactLabel, kindLabel, kindShort, statusLabel, urgencyLabel } from "@/lib/wellbeing";

export const metadata = { title: "Wellbeing request" };

const SAVED: Record<string, string> = {
  status: "Saved.",
  message: "Message sent. They've been emailed to say there's a new message in their portal (the email doesn't include what you wrote).",
  note: "Internal note added.",
};

export default async function WellbeingRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const staff = await requirePermission("wellbeing.view");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [{ data: r }, { data: messages }, { data: services }] = await Promise.all([
    staff.supabase.from("wellbeing_requests").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("wellbeing_messages").select("id, body, internal, created_at, author_id").eq("request_id", id).order("created_at"),
    staff.supabase.from("wellbeing_services").select("id, name, kind, status").neq("status", "archived").order("sort_order"),
  ]);
  if (!r) notFound();
  const peopleIds = [...new Set([r.worker_id, r.assigned_to, ...(messages ?? []).map((m) => m.author_id)].filter(Boolean))] as string[];
  const { data: people } = await staff.supabase.from("profiles").select("id, full_name, phone").in("id", peopleIds);
  const person = (pid: string | null) => people?.find((p) => p.id === pid);
  const worker = person(r.worker_id);
  const canEdit = staff.can("wellbeing.edit");
  const closed = r.status === "closed";

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/wellbeing" className="text-sm font-medium text-brand-700 underline">
          ← Wellbeing requests
        </Link>
      </p>
      {saved && SAVED[saved] && <Notice>{SAVED[saved]}</Notice>}
      <PageHeader
        title={`${r.reference}: ${kindShort(r.kind)}`}
        intro={`From ${worker?.full_name ?? "a care worker"} · ${formatDateTime(r.created_at)} · ${statusLabel(r.status, true)}`}
      />
      <p className="mb-6 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
        🔒 Confidential. Only the wellbeing team can open this page, and the activity log records changes without the words.
      </p>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="What they asked for">
            <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Support</dt>
                <dd className="font-semibold">{kindLabel(r.kind)}</dd>
              </div>
              <div>
                <dt className="text-muted">How soon</dt>
                <dd className={`font-semibold ${r.urgency === "urgent" ? "text-red-800" : ""}`}>{urgencyLabel(r.urgency)}</dd>
              </div>
              <div>
                <dt className="text-muted">Contact them by</dt>
                <dd className="font-semibold">{contactLabel(r.contact_method)}</dd>
              </div>
              <div>
                <dt className="text-muted">Best times</dt>
                <dd className="font-semibold">{r.contact_times || "Any time"}</dd>
              </div>
            </dl>
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4">{r.message}</p>
          </Card>

          <section id="conversation" className="scroll-mt-24">
            <Card title="Conversation">
              <ol className="space-y-3">
                {(messages ?? []).map((m) => {
                  const mine = m.author_id === r.worker_id;
                  return (
                    <li
                      key={m.id}
                      className={`rounded-xl p-3 text-sm ${m.internal ? "border-2 border-dashed border-amber-300 bg-amber-50" : mine ? "bg-gray-50" : "bg-brand-50"}`}
                    >
                      <p className="mb-1 text-xs font-semibold text-muted">
                        {m.internal ? "Internal note · " : ""}
                        {person(m.author_id)?.full_name ?? (mine ? "Care worker" : "Wellbeing team")} · {formatDateTime(m.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </li>
                  );
                })}
                {!messages?.length && <li className="text-sm text-muted">No messages yet. Reply below, or contact them the way they asked.</li>}
              </ol>
              {canEdit && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ActionForm action={addWellbeingMessage} submitLabel="Send to care worker" inline>
                    <input type="hidden" name="id" value={r.id} />
                    <label htmlFor="msg" className="text-sm font-medium text-brand-900">
                      Message to {worker?.full_name?.split(" ")[0] ?? "them"}
                    </label>
                    <textarea id="msg" name="body" rows={4} maxLength={4000} className={adminInput} />
                    <p className="text-xs text-muted">They see this in their portal and get an email saying there&apos;s a new message.</p>
                  </ActionForm>
                  <ActionForm action={addWellbeingMessage} submitLabel="Add internal note" inline secondary>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="internal" value="1" />
                    <label htmlFor="note" className="text-sm font-medium text-brand-900">
                      Internal note
                    </label>
                    <textarea id="note" name="body" rows={4} maxLength={4000} className={adminInput} />
                    <p className="text-xs text-muted">Only the wellbeing team sees notes.</p>
                  </ActionForm>
                </div>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card title="Contact">
            <p className="font-semibold">{worker?.full_name ?? "Care worker"}</p>
            {worker?.phone ? (
              <p className="mt-1 text-sm">
                <a href={`tel:${phoneDigits(worker.phone)}`} className="font-semibold text-brand-700 underline">
                  {worker.phone}
                </a>
                {" · "}
                <a href={whatsappLink(worker.phone)} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                  WhatsApp
                </a>
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">No phone number on their account. Reply in the conversation instead.</p>
            )}
          </Card>

          <Card title="Status">
            {canEdit ? (
              <ActionForm action={updateWellbeingRequest} submitLabel="Save">
                <input type="hidden" name="id" value={r.id} />
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-brand-900">
                    Status
                    <select name="status" defaultValue={r.status} className={adminInput}>
                      {REQUEST_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.staffLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Referred to
                    <select name="service_id" defaultValue={r.service_id ?? ""} className={adminInput}>
                      <option value="">Not referred</option>
                      {(services ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({kindShort(s.kind)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Looked after by
                    <select name="assigned_to" defaultValue={r.assigned_to === staff.user.id ? "me" : (r.assigned_to ?? "")} className={adminInput}>
                      <option value="">Nobody yet</option>
                      <option value="me">Me</option>
                      {r.assigned_to && r.assigned_to !== staff.user.id && <option value={r.assigned_to}>{person(r.assigned_to)?.full_name ?? "A colleague"}</option>}
                    </select>
                  </label>
                </div>
              </ActionForm>
            ) : (
              <p className="text-sm">{statusLabel(r.status, true)}</p>
            )}
            {closed && r.closed_at && <p className="mt-3 text-xs text-muted">Closed {formatDateTime(r.closed_at)}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
