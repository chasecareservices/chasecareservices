import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteResource, saveResource } from "../../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { ResourceFields } from "@/components/admin/ResourceFields";
import { Notice, PageHeader, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { loadOptionSets } from "@/lib/admin/options";
import { NEW_DEFAULTS, getResource } from "@/lib/admin/resources";

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
      {saved && <Notice>Saved. {publicUrl ? "The website has been updated." : "Publish it when it's ready to appear on the website."}</Notice>}
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
