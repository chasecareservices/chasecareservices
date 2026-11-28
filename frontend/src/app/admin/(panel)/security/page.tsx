import Link from "next/link";
import { endSessions, runRetention, saveSecurity } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { AUTH_ACTIONS, RETENTION_CHOICES, deviceLabel } from "@/lib/security";

export const metadata = { title: "Security & sign-ins" };

type Props = { searchParams: Promise<{ saved?: string; n?: string; e?: string; s?: string; r?: string; off?: string; user?: string }> };

export default async function SecurityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const staff = await requirePermission("users.view");
  const forUser = /^[0-9a-f-]{36}$/.test(sp.user ?? "") ? sp.user! : null;
  const [{ data: opts }, { data: sessions }, { data: history }] = await Promise.all([
    staff.supabase.rpc("security_options"),
    staff.supabase.rpc("user_sessions"),
    staff.supabase.rpc("login_history", { for_user: forUser as string, max_rows: 200 }),
  ]);
  const o = opts?.[0];
  const canEdit = staff.can("users.edit");
  const byUser = new Map<string, NonNullable<typeof sessions>>();
  for (const s of sessions ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  return (
    <>
      {sp.saved === "settings" && <Notice>Security settings saved.</Notice>}
      {sp.saved === "ended" && <Notice>Signed out of {sp.n} {sp.n === "1" ? "session" : "sessions"}. They&apos;ll need their password to sign in again.</Notice>}
      {sp.saved === "retention" && (
        <Notice>{sp.off ? "Automatic clean-up is switched off." : `Clean-up done: ${sp.e} old enquiries, ${sp.s} unconfirmed newsletter sign-ups and ${sp.r} old event registrations removed.`}</Notice>
      )}
      <PageHeader title="Security & sign-ins" intro="Who is signed in, recent sign-ins, and how long the dashboard and old data are kept." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Settings">
          {canEdit ? (
            <ActionForm action={saveSecurity} submitLabel="Save settings" inline>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-brand-900">
                  Sign staff out of the dashboard after this many minutes without use
                  <input name="idle" type="number" min={5} max={480} required defaultValue={o?.staff_idle_minutes ?? 30} className={adminInput} />
                  <span className="mt-1 block text-xs font-normal text-muted">They get a one-minute warning first. 15–30 minutes is usual for care data.</span>
                </label>
                <label className="block text-sm font-medium text-brand-900">
                  Delete closed website enquiries after
                  <select name="retention" defaultValue={o?.retention_enquiry_months == null ? "off" : String(o.retention_enquiry_months)} className={adminInput}>
                    {RETENTION_CHOICES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-muted">
                    Checked every night. Also removes newsletter sign-ups never confirmed within 30 days, and event registrations after the same period. Client care records, reports and incidents are never deleted automatically.
                  </span>
                </label>
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm">
              Dashboard sign-out after {o?.staff_idle_minutes} minutes. Closed enquiries kept {o?.retention_enquiry_months ? `${o.retention_enquiry_months} months` : "indefinitely"}.
            </p>
          )}
          <p className="mt-4 text-sm">
            Two-step verification is <strong>{o?.require_staff_mfa ? "required" : "not required"}</strong> for all staff.
          </p>
          {canEdit && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <ActionForm action={runRetention} submitLabel="Run the clean-up now" inline secondary confirm="Delete old closed enquiries and expired sign-ups now? This can't be undone.">
                <span />
              </ActionForm>
            </div>
          )}
        </Card>

        <Card title={`Signed in now (${byUser.size} ${byUser.size === 1 ? "person" : "people"})`}>
          <ul className="divide-y divide-gray-100 text-sm">
            {[...byUser.entries()].map(([uid, list]) => (
              <li key={uid} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <span>
                  <span className="block font-semibold">{list[0].full_name ?? list[0].email}</span>
                  {list.map((s) => (
                    <span key={s.session_id} className="block text-xs text-muted">
                      {deviceLabel(s.user_agent)}
                      {s.ip ? ` · ${s.ip}` : ""} · active {formatDateTime(s.last_active)}
                      {s.two_step ? " · two-step ✓" : ""}
                    </span>
                  ))}
                </span>
                {canEdit && (
                  <ActionForm action={endSessions} submitLabel="Sign out everywhere" inline secondary confirm={`Sign ${list[0].full_name ?? list[0].email} out on every device?`}>
                    <input type="hidden" name="user" value={uid} />
                  </ActionForm>
                )}
              </li>
            ))}
            {!byUser.size && <li className="py-3 text-muted">Nobody is signed in.</li>}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="hist-h" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="hist-h" className="text-xl font-bold text-brand-900">
            Sign-in history{forUser && history?.[0] ? `: ${history[0].full_name ?? history[0].email}` : ""}
          </h2>
          {forUser && (
            <Link href="/admin/security" className="text-sm font-semibold text-brand-700 underline">
              Show everyone
            </Link>
          )}
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Who</th>
                <th scope="col" className="px-4 py-3">What</th>
                <th scope="col" className="px-4 py-3">IP address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(history ?? []).map((h, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-4 py-2">{formatDateTime(h.at)}</td>
                  <td className="px-4 py-2">
                    {h.user_id ? (
                      <Link href={`/admin/security?user=${h.user_id}`} className="text-brand-700 underline">
                        {h.full_name ?? h.email}
                      </Link>
                    ) : (
                      h.email
                    )}
                  </td>
                  <td className="px-4 py-2">{AUTH_ACTIONS[h.action] ?? h.action}</td>
                  <td className="px-4 py-2 text-muted">{h.ip ?? "—"}</td>
                </tr>
              ))}
              {!history?.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No sign-ins recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">From the sign-in service. Failed sign-in attempts aren&apos;t listed here; repeated failures are blocked automatically by Supabase.</p>
      </section>
    </>
  );
}
