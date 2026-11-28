import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { savePolicy } from "../../policy-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { PolicyFields } from "@/components/admin/PolicyFields";
import { Card, Notice, PageHeader, formatDateTime } from "@/components/admin/ui";
import { requireStaff } from "@/lib/admin/session";

export const metadata = { title: "Policy" };

export default async function PolicyEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const staff = await requireStaff();
  if (!staff.can("communications.view") && !staff.can("workforce.view")) redirect("/admin?denied=1");
  const [{ data: p }, { data: acks }, { data: workers }] = await Promise.all([
    staff.supabase.from("policies").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("policy_acknowledgements").select("user_id, version, acknowledged_at").eq("policy_id", id),
    staff.supabase.rpc("list_care_workers"),
  ]);
  if (!p) notFound();
  const active = (workers ?? []).filter((w) => w.is_active);
  const canEdit = staff.can("communications.edit") || staff.can("workforce.edit");
  const current = (uid: string) => (acks ?? []).find((a) => a.user_id === uid && a.version === p.version);
  const older = (uid: string) => (acks ?? []).filter((a) => a.user_id === uid && a.version < p.version).sort((a, b) => b.version - a.version)[0];
  const readers = active.filter((w) => current(w.id));
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/communications/policies" className="text-sm font-medium text-brand-700 underline">
          ← Policies
        </Link>
      </p>
      {saved && <Notice>Policy saved.</Notice>}
      <PageHeader title={p.title} intro={`Version ${p.version} · ${p.status}${p.published_at ? ` · published ${formatDateTime(p.published_at)}` : ""}`} />
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Edit">
          {canEdit ? (
            <ActionForm action={savePolicy} submitLabel="Save policy">
              <input type="hidden" name="id" value={p.id} />
              <PolicyFields p={p} existing />
            </ActionForm>
          ) : (
            <p className="whitespace-pre-line text-sm">{p.body}</p>
          )}
        </Card>
        <Card title={p.must_read ? `Read version ${p.version}: ${readers.length} of ${active.length}` : "Read by care workers"}>
          {!p.must_read ? (
            <p className="text-sm text-muted">This policy doesn&apos;t ask for confirmation.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {active.map((w) => {
                const a = current(w.id);
                const o = older(w.id);
                return (
                  <li key={w.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-medium">{w.full_name ?? w.email}</span>
                    <span className={a ? "text-green-800" : "text-amber-800"}>
                      {a ? `✓ ${formatDateTime(a.acknowledged_at)}` : o ? `Read v${o.version}, not v${p.version} yet` : "Not read yet"}
                    </span>
                  </li>
                );
              })}
              {!active.length && <li className="py-2 text-muted">No active care workers.</li>}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
