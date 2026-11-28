import Link from "next/link";
import { notFound } from "next/navigation";
import { closeRequest, erasePerson } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { daysLeft, kindLabel, summarise, type PersonData } from "@/lib/data-requests";

export const metadata = { title: "Data request" };

export default async function DataRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const staff = await requirePermission("users.view");
  const { data: r } = await staff.supabase.from("data_requests").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: found } = r.person_email ? await staff.supabase.rpc("person_data", { lookup: r.person_email }) : { data: null };
  const held = found ? summarise(found as unknown as PersonData) : [];
  const d = found as unknown as PersonData | null;
  const canEdit = staff.can("users.edit");
  const left = daysLeft(r.due_on);

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/data-requests" className="text-sm font-medium text-brand-700 underline">
          ← Data requests
        </Link>
      </p>
      {saved === "added" && <Notice>Request logged. Due by {new Date(`${r.due_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}.</Notice>}
      {saved === "erased" && <Notice>Their website data has been erased. The result is noted below.</Notice>}
      {saved === "status" && <Notice>Saved.</Notice>}
      <PageHeader
        title={r.person_name}
        intro={`${kindLabel(r.kind)} · received ${new Date(`${r.received_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · ${r.status === "open" ? (left < 0 ? `overdue by ${-left} days` : `${left} days left`) : r.status}`}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="What we hold">
          {!r.person_email ? (
            <p className="text-sm text-muted">No email address was recorded, so their data can&apos;t be looked up automatically. For a client&apos;s care record, open the client in Clients.</p>
          ) : held.length ? (
            <>
              <p className="mb-2 text-sm">For {r.person_email}:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {held.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <a href={`/admin/data-requests/export?email=${encodeURIComponent(r.person_email)}`} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
                Download a copy (file)
              </a>
              <p className="mt-2 text-xs text-muted">Send it to them securely, e.g. as an email attachment to the address on record.</p>
            </>
          ) : (
            <p className="text-sm">Nothing is held for {r.person_email}.</p>
          )}
          {r.details && <p className="mt-4 whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm">{r.details}</p>}
        </Card>

        <div className="space-y-6">
          {canEdit && r.person_email && (d?.enquiries.length || d?.newsletter || d?.event_registrations.length || d?.job_applications.length) ? (
            <Card title="Erase their website data">
              <p className="mb-3 text-sm">
                Deletes their enquiries, newsletter sign-up, event registrations and job applications, including copies in the activity log. This can&apos;t be undone.
              </p>
              {d?.account && (
                <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                  They also have an account. It is <strong>not</strong> deleted here: care records must be kept. To stop them using it, deactivate the account in Staff &amp; roles.
                </p>
              )}
              <ActionForm action={erasePerson} submitLabel="Erase website data" inline secondary confirm="Erase this person's website data permanently?">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="email" value={r.person_email} />
                <label className="block text-sm font-medium text-brand-900">
                  Type their email to confirm
                  <input name="confirm_email" required autoComplete="off" className={adminInput} />
                </label>
              </ActionForm>
            </Card>
          ) : null}

          <Card title="Outcome">
            {r.outcome && <p className="mb-3 whitespace-pre-line rounded-xl bg-gray-50 p-3 text-sm">{r.outcome}</p>}
            {r.completed_at && <p className="mb-3 text-xs text-muted">Closed {formatDateTime(r.completed_at)}</p>}
            {canEdit && (
              <ActionForm action={closeRequest} submitLabel="Save" inline>
                <input type="hidden" name="id" value={r.id} />
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                  <label className="text-sm font-medium text-brand-900">
                    Status
                    <select name="status" defaultValue={r.status} className={adminInput}>
                      <option value="open">Open</option>
                      <option value="done">Done</option>
                      <option value="declined">Declined</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-brand-900">
                    What was done
                    <input name="outcome" maxLength={2000} defaultValue="" placeholder="e.g. Copy emailed on 3 Dec" className={adminInput} />
                  </label>
                </div>
              </ActionForm>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
