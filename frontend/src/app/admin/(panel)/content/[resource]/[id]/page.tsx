import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteResource, saveResource } from "../../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { ResourceFields } from "@/components/admin/ResourceFields";
import { Notice, PageHeader, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { loadOptionSets } from "@/lib/admin/options";
import { NEW_DEFAULTS, getResource } from "@/lib/admin/resources";
import { sendArticle } from "../../../subscribers/actions";

// Emailing an article to subscribers sends one email per person.
export const maxDuration = 60;

type Props = { params: Promise<{ resource: string; id: string }>; searchParams: Promise<{ saved?: string }> };

export async function generateMetadata({ params }: Props) {
  const { resource, id } = await params;
  const r = getResource(resource);
  return { title: r ? `${id === "new" ? "New" : "Edit"} ${r.singular}` : "Content" };
}

export default async function ResourceEditPage({ params, searchParams }: Props) {
  const { resource: key, id } = await params;
  const { saved } = await searchParams;
  const resource = getResource(key);
  if (!resource) notFound();
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();

  const staff = await requirePermission(`${resource.section}.${isNew ? "create" : "view"}`);
  let row: Record<string, unknown> = NEW_DEFAULTS[resource.key] ?? {};
  if (!isNew) {
    const { data } = await staff.supabase.from(resource.table as "services").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    row = data as unknown as Record<string, unknown>;
    if (resource.exclude && row[resource.exclude.column] === resource.exclude.value) notFound();
  }
  const optionSets = await loadOptionSets(staff.supabase, resource, isNew ? undefined : id);
  const canEdit = staff.can(`${resource.section}.${isNew ? "create" : "edit"}`);
  const publicUrl = !isNew && row.status !== "draft" && row.status !== "archived" ? resource.publicUrl?.(row) : null;
  const title = isNew ? `New ${resource.singular}` : String(row[resource.titleField] ?? resource.singular);

  return (
    <>
      <p className="mb-4">
        <Link href={`/admin/content/${resource.key}`} className="text-sm font-medium text-brand-700 underline">
          ← {resource.title}
        </Link>
      </p>
      {saved === "emailed" && <Notice>Article emailed to subscribers.</Notice>}
      {saved && saved !== "emailed" && <Notice>Saved. {publicUrl ? "The website has been updated." : "Publish it when it's ready to appear on the website."}</Notice>}
      <PageHeader
        title={title.slice(0, 120)}
        intro={!isNew && row.updated_at ? `Last changed ${formatDateTime(row.updated_at as string)}` : resource.intro}
        actions={
          publicUrl && (
            <Link href={publicUrl} target="_blank" className="text-sm font-semibold text-brand-700 underline">
              View on website ↗
            </Link>
          )
        }
      />

      {canEdit ? (
        <ActionForm action={saveResource} submitLabel={isNew ? `Create ${resource.singular}` : "Save changes"}>
          <input type="hidden" name="__resource" value={resource.key} />
          {!isNew && <input type="hidden" name="__id" value={id} />}
          <ResourceFields resource={resource} row={row} optionSets={optionSets} />
        </ActionForm>
      ) : (
        <>
          <Notice tone="info">You can view this but not change it.</Notice>
          <fieldset disabled>
            <ResourceFields resource={resource} row={row} optionSets={optionSets} />
          </fieldset>
        </>
      )}

      {resource.key === "posts" && !isNew && staff.can("communications.view") && (
        <EmailToSubscribers postId={id} live={Boolean(publicUrl) && row.status === "published"} canSend={staff.can("communications.edit")} db={staff.supabase} />
      )}

      {!isNew && staff.can(`${resource.section}.delete`) && (
        <section className="mt-10 rounded-2xl border border-red-200 bg-white p-5">
          <h2 className="font-semibold text-red-800">Delete this {resource.singular}</h2>
          <p className="mt-1 text-sm text-muted">
            This can&apos;t be undone. To hide it from the website but keep it, set the status to Draft or Archived instead.
          </p>
          <ActionForm action={deleteResource} submitLabel="Delete" pendingLabel="Deleting…" confirm={`Delete this ${resource.singular}? This can't be undone.`} secondary>
            <input type="hidden" name="__resource" value={resource.key} />
            <input type="hidden" name="__id" value={id} />
          </ActionForm>
        </section>
      )}
    </>
  );
}

/** Shows whether this article was emailed to subscribers, and lets the office send it once. */
async function EmailToSubscribers({
  postId,
  live,
  canSend,
  db,
}: {
  postId: string;
  live: boolean;
  canSend: boolean;
  db: Awaited<ReturnType<typeof requirePermission>>["supabase"];
}) {
  const [{ data: sent }, { data: counts }] = await Promise.all([
    db.from("newsletter_sends").select("started_at, recipients, failed").eq("post_id", postId).maybeSingle(),
    db.rpc("newsletter_counts"),
  ]);
  const subscribers = Number(counts?.[0]?.subscribed ?? 0);
  return (
    <section aria-labelledby="email-subs-h" className="mt-10 rounded-2xl border border-brand-200 bg-white p-5">
      <h2 id="email-subs-h" className="font-semibold text-brand-900">
        Email to subscribers
      </h2>
      {sent ? (
        <p className="mt-1 text-sm text-muted">
          Emailed {formatDateTime(sent.started_at)} to {sent.recipients - sent.failed} of {sent.recipients} subscribers. Each article can only be emailed once.
        </p>
      ) : !live ? (
        <p className="mt-1 text-sm text-muted">Publish the article first. Then you can email it to your {subscribers} subscribers.</p>
      ) : !subscribers ? (
        <p className="mt-1 text-sm text-muted">Nobody has confirmed a subscription yet, so there is no one to email.</p>
      ) : canSend ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Sends the title, summary, cover photo and a link to the article to {subscribers} {subscribers === 1 ? "person" : "people"}. You can only do this once per article.
          </p>
          <div className="mt-3">
            <ActionForm
              action={sendArticle}
              submitLabel={`Email ${subscribers} subscriber${subscribers === 1 ? "" : "s"}`}
              pendingLabel="Sending…"
              confirm={`Email this article to ${subscribers} subscriber${subscribers === 1 ? "" : "s"} now? This can't be undone.`}
            >
              <input type="hidden" name="post_id" value={postId} />
            </ActionForm>
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">Not emailed yet. Ask someone who manages communications to send it.</p>
      )}
    </section>
  );
}
