import Link from "next/link";
import { notFound } from "next/navigation";
import { addRegistration, remindAttendees, saveAttendance, updateEvent } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { EventFields } from "@/components/admin/EventFields";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { REGISTRATION_STATUS, attendLabel, eventDate, eventKindLabel, eventTime, isOver } from "@/lib/events";

export const metadata = { title: "Event" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; sent?: string; nomail?: string }> };

export default async function EventAdminPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved, sent, nomail } = await searchParams;
  const staff = await requirePermission("community.view");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data: e }, { data: link }, { data: regs }] = await Promise.all([
    staff.supabase.from("community_events").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("community_event_links").select("online_url").eq("event_id", id).maybeSingle(),
    staff.supabase.from("event_registrations").select("*").eq("event_id", id).order("created_at"),
  ]);
  if (!e) notFound();
  const canEdit = staff.can("community.edit");
  const active = (regs ?? []).filter((r) => r.status !== "cancelled");
  const inRoom = active.filter((r) => r.attend_mode === "in_person").length;
  const online = active.filter((r) => r.attend_mode === "online").length;
  const over = isOver(e);
  const notices: Record<string, string> = {
    created: "Event saved.",
    event: "Event saved.",
    nolink: "Event saved, but the online link wasn't: it must start with https://",
    attendance: "Attendance saved.",
    added: "Registration added.",
    reminded: `Reminder sent to ${sent ?? 0} ${sent === "1" ? "person" : "people"}.${Number(nomail) ? ` ${nomail} registered by phone only: call or WhatsApp them.` : ""}`,
  };

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/events" className="text-sm font-medium text-brand-700 underline">
          ← Events
        </Link>
      </p>
      {saved && notices[saved] && <Notice tone={saved === "nolink" ? "error" : "success"}>{notices[saved]}</Notice>}
      <PageHeader
        title={e.title}
        intro={`${eventKindLabel(e.kind)} · ${eventDate(e.starts_at)}, ${eventTime(e.starts_at, e.ends_at)}`}
        actions={
          e.status === "published" ? (
            <a href={`/community/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 underline">
              View on website
            </a>
          ) : null
        }
      />

      <section id="registrations" className="mb-8 scroll-mt-24">
        <Card title={`Registrations: ${active.length}${e.capacity ? ` (${inRoom} of ${e.capacity} places in the room)` : ""}${e.online ? ` · ${online} online` : ""}`}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {canEdit && !over && active.some((r) => r.status === "registered") && (
              <ActionForm action={remindAttendees} submitLabel="Email a reminder to everyone registered" pendingLabel="Sending…" inline secondary confirm="Send the reminder email now?">
                <input type="hidden" name="id" value={e.id} />
              </ActionForm>
            )}
            {staff.can("community.export") && (
              <a href={`/admin/events/${e.id}/export`} className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">
                Download the list (CSV)
              </a>
            )}
          </div>
          {e.online && !link && !over && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Add the online joining link below so it is included in confirmations and reminders.</p>}
          {regs?.length ? (
            <ActionForm action={saveAttendance} submitLabel="Save attendance">
              <input type="hidden" name="id" value={e.id} />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-3">Name</th>
                      <th scope="col" className="py-2 pr-3">Contact</th>
                      <th scope="col" className="py-2 pr-3">Joining</th>
                      <th scope="col" className="py-2 pr-3">Notes</th>
                      <th scope="col" className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {regs.map((r) => (
                      <tr key={r.id} className={r.status === "cancelled" ? "text-muted line-through" : ""}>
                        <td className="py-2 pr-3 font-semibold">
                          {r.full_name}
                          {r.organisation && <span className="block text-xs font-normal text-muted">{r.organisation}</span>}
                          <span className="block text-xs font-normal text-muted">
                            {r.source === "staff" ? "Added by staff" : "Website"} · {formatDateTime(r.created_at)}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {r.email && <span className="block">{r.email}</span>}
                          {r.phone && <span className="block">{r.phone}</span>}
                        </td>
                        <td className="py-2 pr-3">{attendLabel(r.attend_mode)}</td>
                        <td className="max-w-56 py-2 pr-3 text-xs">{r.needs}</td>
                        <td className="py-2">
                          <label className="sr-only" htmlFor={`st-${r.id}`}>
                            Status for {r.full_name}
                          </label>
                          <select id={`st-${r.id}`} name={`status_${r.id}`} defaultValue={r.status} disabled={!canEdit} className="min-h-10 rounded-lg border border-gray-300 bg-white px-2">
                            {REGISTRATION_STATUS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">Nobody has registered yet.</p>
          )}
          {staff.can("community.create") && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-brand-800">Add someone who registered by phone or at the door</summary>
              <div className="mt-3 max-w-2xl">
                <ActionForm action={addRegistration} submitLabel="Add registration" inline>
                  <input type="hidden" name="id" value={e.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-medium text-brand-900">
                      Name
                      <input name="full_name" required maxLength={120} className={adminInput} />
                    </label>
                    <label className="text-sm font-medium text-brand-900">
                      Phone
                      <input name="phone" type="tel" maxLength={40} className={adminInput} />
                    </label>
                    <label className="text-sm font-medium text-brand-900">
                      Email
                      <input name="email" type="email" className={adminInput} />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-5 text-sm">
                    {e.online && (
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="attend_mode" value="online" className="h-5 w-5 accent-brand-800" /> Joining online
                      </label>
                    )}
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="attended" className="h-5 w-5 accent-brand-800" /> They&apos;re here now (mark attended)
                    </label>
                  </div>
                </ActionForm>
              </div>
            </details>
          )}
        </Card>
      </section>

      <Card title="Event details" className="max-w-4xl">
        {canEdit ? (
          <ActionForm action={updateEvent} submitLabel="Save event">
            <input type="hidden" name="id" value={e.id} />
            <EventFields e={e} onlineUrl={link?.online_url ?? ""} />
          </ActionForm>
        ) : (
          <p className="text-sm">{e.summary}</p>
        )}
      </Card>
    </>
  );
}
