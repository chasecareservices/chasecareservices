import Link from "next/link";
import { notFound } from "next/navigation";
import { replyToWellbeing } from "@/app/portal/wellbeing-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { requireWorker } from "@/lib/portal/session";
import { contactLabel, kindLabel, statusLabel, urgencyLabel } from "@/lib/wellbeing";

export const metadata = { title: "Your wellbeing request" };

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "UTC" });

export default async function PortalWellbeingRequest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string; replied?: string }> }) {
  const { id } = await params;
  const { sent, replied } = await searchParams;
  const worker = await requireWorker();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data: r }, { data: messages }] = await Promise.all([
    worker.supabase.from("wellbeing_requests").select("id, reference, kind, urgency, contact_method, contact_times, message, status, created_at, worker_id").eq("id", id).eq("worker_id", worker.user.id).maybeSingle(),
    worker.supabase.from("wellbeing_messages").select("id, body, author_id, created_at").eq("request_id", id).order("created_at"),
  ]);
  if (!r) notFound();
  const closed = r.status === "closed";

  return (
    <div>
      <p className="mb-4">
        <Link href="/portal/wellbeing" className="text-sm font-semibold text-brand-700 underline">
          ← Wellbeing Hub
        </Link>
      </p>
      {sent && (
        <div role="status" className="mb-5 rounded-2xl bg-green-50 p-4 text-green-950 ring-1 ring-green-200">
          <p className="font-semibold">Sent in confidence. Thank you for reaching out.</p>
          <p className="text-sm">
            The wellbeing team will contact you by {contactLabel(r.contact_method).toLowerCase()}
            {r.urgency === "urgent" ? " as soon as they can" : ""}. Replies also appear here.
          </p>
        </div>
      )}
      {replied && (
        <p role="status" className="mb-5 rounded-2xl bg-green-50 p-4 font-semibold text-green-950 ring-1 ring-green-200">
          Message sent.
        </p>
      )}
      <h1 className="text-2xl font-bold text-brand-900">{kindLabel(r.kind)}</h1>
      <p className="text-muted">
        {r.reference} · {fmt(r.created_at)} · <span className="font-semibold text-brand-900">{statusLabel(r.status)}</span>
      </p>

      <section aria-labelledby="you-h" className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-brand-100">
        <h2 id="you-h" className="text-sm font-semibold text-muted">
          What you sent · {urgencyLabel(r.urgency)} · {contactLabel(r.contact_method)}
          {r.contact_times ? ` (${r.contact_times})` : ""}
        </h2>
        <p className="mt-2 whitespace-pre-wrap">{r.message}</p>
      </section>

      <section id="conversation" aria-labelledby="conv-h" className="mt-6 scroll-mt-24">
        <h2 id="conv-h" className="text-xl font-bold text-brand-900">Messages</h2>
        <ol className="mt-3 space-y-3">
          {(messages ?? []).map((m) => {
            const mine = m.author_id === worker.user.id;
            return (
              <li key={m.id} className={`rounded-2xl p-4 ${mine ? "ml-8 bg-brand-800 text-white" : "mr-8 bg-white ring-1 ring-brand-100"}`}>
                <p className={`text-xs font-semibold ${mine ? "text-brand-100" : "text-muted"}`}>
                  {mine ? "You" : "Wellbeing team"} · {fmt(m.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              </li>
            );
          })}
          {!messages?.length && <li className="rounded-2xl bg-white p-4 text-muted ring-1 ring-brand-100">No messages yet. The team may call or message you directly.</li>}
        </ol>
        {closed ? (
          <p className="mt-4 text-sm text-muted">
            This request is closed. Need more help?{" "}
            <Link href="/portal/wellbeing/ask" className="font-semibold text-brand-700 underline">
              Ask again
            </Link>
          </p>
        ) : (
          <ActionForm action={replyToWellbeing} submitLabel="Send message" pendingLabel="Sending…" className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-brand-100">
            <input type="hidden" name="id" value={r.id} />
            <label htmlFor="reply" className="font-semibold text-brand-900">
              Write to the wellbeing team
            </label>
            <textarea id="reply" name="body" required rows={3} maxLength={4000} className="mt-1 block w-full rounded-xl border border-brand-200 px-4 py-3 text-base" />
          </ActionForm>
        )}
      </section>
    </div>
  );
}
