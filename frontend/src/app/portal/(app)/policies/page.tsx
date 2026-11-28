import Link from "next/link";
import { requireWorker } from "@/lib/portal/session";

export const metadata = { title: "Policies" };

export default async function PortalPolicies() {
  const worker = await requireWorker();
  const [{ data: policies }, { data: acks }] = await Promise.all([
    worker.supabase.from("policies").select("id, title, category, summary, version, must_read").order("sort_order").order("title"),
    worker.supabase.from("policy_acknowledgements").select("policy_id, version").eq("user_id", worker.user.id),
  ]);
  const read = (p: { id: string; version: number }) => (acks ?? []).some((a) => a.policy_id === p.id && a.version === p.version);
  const todo = (policies ?? []).filter((p) => p.must_read && !read(p));
  return (
    <div className="space-y-6">
      <p>
        <Link href="/portal" className="text-sm font-semibold text-brand-700 underline">
          ← Today
        </Link>
      </p>
      <div>
        <h1 className="text-3xl font-bold text-brand-900">Policies</h1>
        <p className="mt-1 text-muted">How we work at Chase Care. Please read each one and confirm you understand it.</p>
      </div>
      {todo.length > 0 && (
        <p role="note" className="rounded-2xl bg-accent-50 p-4 font-semibold text-ink ring-1 ring-accent-300">
          {todo.length === 1 ? "1 policy" : `${todo.length} policies`} to read
        </p>
      )}
      <ul className="space-y-2">
        {(policies ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/portal/policies/${p.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-brand-100 hover:ring-brand-400">
              <span>
                <span className="block font-semibold text-brand-900">{p.title}</span>
                <span className="block text-sm text-muted">{p.category ?? p.summary ?? ""}</span>
              </span>
              {p.must_read &&
                (read(p) ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-900">Read ✓</span>
                ) : (
                  <span className="rounded-full bg-accent-100 px-3 py-1 text-sm font-semibold text-accent-900">To read</span>
                ))}
            </Link>
          </li>
        ))}
        {!policies?.length && <li className="rounded-2xl bg-white p-4 text-muted ring-1 ring-brand-100">No policies have been published yet.</li>}
      </ul>
    </div>
  );
}
