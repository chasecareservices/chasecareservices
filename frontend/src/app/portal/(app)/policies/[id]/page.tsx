import Link from "next/link";
import { notFound } from "next/navigation";
import { acknowledgePolicy } from "@/app/portal/policy-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Policy" };

export default async function PortalPolicy({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ read?: string }> }) {
  const { id } = await params;
  const { read: justRead } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const worker = await requireWorker();
  const [{ data: p }, { data: ack }] = await Promise.all([
    worker.supabase.from("policies").select("id, title, category, summary, body, document_url, version, must_read, published_at").eq("id", id).maybeSingle(),
    worker.supabase.from("policy_acknowledgements").select("version, acknowledged_at").eq("policy_id", id).eq("user_id", worker.user.id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!p) notFound();
  const done = ack?.version === p.version;
  return (
    <article>
      <p className="mb-4">
        <Link href="/portal/policies" className="text-sm font-semibold text-brand-700 underline">
          ← Policies
        </Link>
      </p>
      {justRead && (
        <p role="status" className="mb-5 rounded-2xl bg-green-50 p-4 font-semibold text-green-950 ring-1 ring-green-200">
          Thank you. We&apos;ve recorded that you read this policy.
        </p>
      )}
      {p.category && <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">{p.category}</p>}
      <h1 className="text-3xl font-bold text-brand-900">{p.title}</h1>
      <p className="text-sm text-muted">
        Version {p.version}
        {p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}` : ""}
      </p>
      {ack && !done && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">This policy has changed since you last read it. Please read it again.</p>
      )}
      {p.summary && <p className="mt-4 text-lg font-medium">{p.summary}</p>}
      <div className="mt-4 space-y-4 leading-relaxed">
        {(p.body ?? "")
          .split(/\n\s*\n/)
          .filter((x) => x.trim())
          .map((x, i) => (
            <p key={i} className="whitespace-pre-line">
              {x.trim()}
            </p>
          ))}
      </div>
      {p.document_url && (
        <p className="mt-5">
          <a href={p.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">
            Open the full document<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}
      {p.must_read && (
        <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
          {done ? (
            <p className="font-semibold text-green-900">
              ✓ You confirmed you read and understood this on{" "}
              {new Date(ack!.acknowledged_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.
            </p>
          ) : (
            <ActionForm action={acknowledgePolicy} submitLabel="I have read and understood this policy" pendingLabel="Saving…" inline>
              <input type="hidden" name="id" value={p.id} />
              <p className="mb-3 text-sm text-muted">If anything is unclear, ask the office before you confirm.</p>
            </ActionForm>
          )}
        </div>
      )}
    </article>
  );
}
