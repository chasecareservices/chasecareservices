import Link from "next/link";
import { deleteDocument } from "@/app/documents-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, formatDateTime } from "@/components/admin/ui";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { requireStaff } from "@/lib/admin/session";
import { CATEGORIES, categoryLabel, formatBytes } from "@/lib/drive/files";

/**
 * The Documents box on a client's or care worker's page: files kept in the company
 * Google Drive, opened through the dashboard so permissions are always checked.
 */
export async function DocumentsPanel({ owner, reportId }: { owner: { kind: "client" | "worker"; id: string; name: string }; reportId?: string }) {
  const staff = await requireStaff();
  const view = owner.kind === "client" ? "clients.view" : "workforce.view";
  const edit = owner.kind === "client" ? "clients.edit" : "workforce.edit";
  if (!staff.can(view)) return null;
  let q = staff.supabase
    .from("care_documents")
    .select("id, name, mime_type, size_bytes, category, created_at, report_id, uploader:profiles!care_documents_uploaded_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  q = owner.kind === "client" ? q.eq("client_id", owner.id) : q.eq("worker_id", owner.id);
  if (reportId) q = q.eq("report_id", reportId);
  const [{ data: docs }, { data: status }] = await Promise.all([q, staff.supabase.rpc("drive_status")]);
  const connected = Boolean(status?.[0]?.connected);
  const canEdit = staff.can(edit);

  return (
    <section id="documents" className="scroll-mt-24">
      <Card title={reportId ? "Files sent with this report" : "Documents"}>
        {!reportId && (
          <p className="mb-3 text-sm text-muted">
            Kept in the company Google Drive{connected ? ` (${status?.[0]?.account_email})` : ""}, in {owner.kind === "client" ? "Clients" : "Care workers"} / {owner.name}. Only office staff can open them.
          </p>
        )}
        {!docs?.length ? (
          <p className="text-sm text-muted">{reportId ? "No files were sent with this report." : "No documents yet."}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {docs.map((d) => {
              const by = d.uploader as unknown as { full_name: string | null } | null;
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="font-semibold text-brand-800 underline">
                      {d.name}
                    </a>
                    <span className="block text-xs text-muted">
                      {categoryLabel(d.category)} · {formatBytes(Number(d.size_bytes))} · added {formatDateTime(d.created_at)}
                      {by?.full_name ? ` by ${by.full_name}` : ""}
                      {d.report_id && !reportId ? (
                        <>
                          {" · "}
                          <Link href={`/admin/care-reports/${d.report_id}`} className="underline">
                            from a visit report
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </span>
                  {canEdit && (
                    <ActionForm action={deleteDocument} submitLabel="Remove" secondary confirm={`Remove "${d.name}"? It goes to the Google Drive bin for 30 days.`}>
                      <input type="hidden" name="id" value={d.id} />
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!reportId &&
          canEdit &&
          (connected ? (
            <div className="mt-4 rounded-xl bg-brand-50 p-4">
              <DocumentUploader ownerKind={owner.kind} ownerId={owner.id} categories={CATEGORIES[owner.kind]} />
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
              To upload documents, the owner needs to{" "}
              <Link href="/admin/settings#documents" className="font-semibold underline">
                connect the company Google Drive in Site settings
              </Link>
              .
            </p>
          ))}
      </Card>
    </section>
  );
}
