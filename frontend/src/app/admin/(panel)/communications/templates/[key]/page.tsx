import Link from "next/link";
import { notFound } from "next/navigation";
import { resetTemplate, saveTemplate } from "../../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { renderCopy, templateDef } from "@/lib/email/templates";

export const metadata = { title: "Edit email" };

const SAMPLE: Record<string, string> = { first_name: "Ama", client_name: "Auntie Akosua", course: "Dementia Care", event: "Monthly ChaseCare Community Forum", date: "Thursday, 17 December 2026" };

export default async function TemplateEdit({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { key } = await params;
  const { saved } = await searchParams;
  const def = templateDef(key);
  if (!def) notFound();
  const staff = await requirePermission("communications.view");
  const { data: row } = await staff.supabase.from("email_templates").select("subject, heading, message, updated_at").eq("key", key).maybeSingle();
  const preview = renderCopy(key, row ? { subject: row.subject ?? "", heading: row.heading ?? "", message: row.message ?? "" } : null, SAMPLE);
  const canEdit = staff.can("communications.edit");

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/communications/templates" className="text-sm font-medium text-brand-700 underline">
          ← Email templates
        </Link>
      </p>
      {saved === "1" && <Notice>Saved. The next emails use your wording.</Notice>}
      {saved === "reset" && <Notice>Back to the built-in wording.</Notice>}
      <PageHeader title={def.name} intro={def.when} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Wording">
          {canEdit ? (
            <ActionForm action={saveTemplate} submitLabel="Save wording">
              <input type="hidden" name="key" value={key} />
              <div className="space-y-4">
                {(
                  [
                    ["subject", "Subject line", 200, false],
                    ["heading", "Heading", 200, false],
                    ["message", "Message", 2000, true],
                  ] as const
                ).map(([name, label, max, long]) => (
                  <label key={name} className="block text-sm font-medium text-brand-900">
                    {label}
                    <span className="block text-xs font-normal text-muted">Built-in: “{def.defaults[name] || "(none)"}”</span>
                    {long ? (
                      <textarea name={name} rows={5} maxLength={max} defaultValue={row?.[name] ?? ""} placeholder="Leave empty to use the built-in wording" className={adminInput} />
                    ) : (
                      <input name={name} maxLength={max} defaultValue={row?.[name] ?? ""} placeholder="Leave empty to use the built-in wording" className={adminInput} />
                    )}
                  </label>
                ))}
                <div className="rounded-xl bg-brand-50 p-3 text-sm">
                  <p className="font-semibold text-brand-900">Placeholders you can use</p>
                  {Object.keys(def.placeholders).length ? (
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(def.placeholders).map(([k, v]) => (
                        <li key={k}>
                          <code className="rounded bg-white px-1">{`{${k}}`}</code> {v}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">None for this email.</p>
                  )}
                </div>
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">You can view this email but not change it.</p>
          )}
          {row && canEdit && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs text-muted">Last changed {formatDateTime(row.updated_at)}</p>
              <ActionForm action={resetTemplate} submitLabel="Go back to the built-in wording" inline secondary confirm="Use the built-in wording again?">
                <input type="hidden" name="key" value={key} />
              </ActionForm>
            </div>
          )}
        </Card>
        <Card title="Preview (with example details)">
          <div className="rounded-xl border border-gray-200">
            <p className="border-b border-gray-200 px-4 py-2 text-sm">
              <span className="text-muted">Subject: </span>
              <strong>{preview.subject}</strong>
            </p>
            <div className="p-4">
              <p className="mb-3 text-lg font-bold text-brand-900">{preview.heading}</p>
              {preview.message ? (
                preview.message.split(/\n\s*\n/).map((p, i) => (
                  <p key={i} className="mb-2 whitespace-pre-line text-sm">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted">(No extra message: the email shows the details and a button.)</p>
              )}
              <p className="mt-3 text-xs text-muted">The details (dates, links, buttons) are added automatically below.</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
