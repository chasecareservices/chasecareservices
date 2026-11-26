import Link from "next/link";
import { removeSubscriber } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { emailTransport } from "@/lib/email/send";

export const metadata = { title: "Subscribers" };

const STATUS: Record<string, string> = { subscribed: "Subscribed", pending: "Waiting for them to confirm", unsubscribed: "Unsubscribed" };

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  const { q = "", saved } = await searchParams;
  const staff = await requirePermission("communications.view");
  let query = staff.supabase
    .from("newsletter_subscribers")
    .select("id, email, full_name, status, created_at, confirmed_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const term = q.trim().replace(/[%_,()]/g, "");
  if (term) query = query.ilike("email", `%${term}%`);
  const [{ data: list }, { data: counts }, { data: sends }] = await Promise.all([
    query,
    staff.supabase.rpc("newsletter_counts"),
    staff.supabase.from("newsletter_sends").select("id, recipients, failed, started_at, post:posts(id, title)").order("started_at", { ascending: false }).limit(10),
  ]);
  const c = counts?.[0];

  return (
    <>
      {saved === "removed" && <Notice>Removed from the list.</Notice>}
      <PageHeader
        title="Subscribers"
        intro="People who asked for new articles by email. They only count once they click the confirmation link we email them."
        actions={
          staff.can("communications.export") ? (
            <Link href="/admin/subscribers/export" prefetch={false} download className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50">
              Download list (CSV)
            </Link>
          ) : null
        }
      />
      {!emailTransport() && (
        <Notice tone="error">Email isn&apos;t set up, so confirmation emails can&apos;t be sent and nobody can finish signing up. See Site settings → Email alerts.</Notice>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Subscribed", c?.subscribed ?? 0],
          ["Waiting to confirm", c?.pending ?? 0],
          ["Unsubscribed", c?.unsubscribed ?? 0],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-2xl bg-white p-5 ring-1 ring-gray-200">
            <p className="text-3xl font-bold text-brand-900">{Number(n)}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card title="People">
          <form className="mb-4 flex gap-2" action="/admin/subscribers">
            <label htmlFor="q" className="sr-only">
              Search by email
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Search by email" className="min-h-10 w-full max-w-xs rounded-lg border border-gray-300 px-3 text-sm" />
            <button type="submit" className="min-h-10 rounded-full bg-brand-800 px-4 text-sm font-semibold text-white">
              Search
            </button>
          </form>
          {!list?.length ? (
            <p className="text-sm text-muted">{term ? "Nobody matches that search." : "Nobody has subscribed yet. The sign-up form is in the footer and on the News & Blog pages."}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {list.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-semibold text-brand-900">{s.email}</span>
                    {s.full_name && <span className="text-muted"> · {s.full_name}</span>}
                    <span className="block text-xs text-muted">
                      {STATUS[s.status]} · signed up {formatDateTime(s.created_at)}
                    </span>
                  </span>
                  {staff.can("communications.delete") && (
                    <ActionForm action={removeSubscriber} submitLabel="Remove" secondary confirm={`Remove ${s.email} from the list completely?`}>
                      <input type="hidden" name="id" value={s.id} />
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Articles emailed" className="h-fit">
          {!sends?.length ? (
            <p className="text-sm text-muted">
              None yet. To email an article, open it under{" "}
              <Link href="/admin/content/posts" className="font-semibold text-brand-700 underline">
                The Journal
              </Link>{" "}
              and use &ldquo;Email to subscribers&rdquo;.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {sends.map((s) => {
                const post = s.post as unknown as { id: string; title: string } | null;
                return (
                  <li key={s.id}>
                    <Link href={`/admin/content/posts/${post?.id}`} className="font-semibold text-brand-700 underline">
                      {post?.title ?? "Article"}
                    </Link>
                    <span className="block text-xs text-muted">
                      {formatDateTime(s.started_at)} · {s.recipients - s.failed} of {s.recipients} sent
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
