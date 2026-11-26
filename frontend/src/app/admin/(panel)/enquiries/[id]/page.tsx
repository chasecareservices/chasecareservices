import Link from "next/link";
import { notFound } from "next/navigation";
import { addEnquiryNote, createClientFromEnquiry, updateEnquiryStatus } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { mapsEmbed, mapsLink } from "@/lib/care";
import { Card, Notice, PageHeader, StatusBadge, STATUS_LABELS, adminButton, adminButtonSecondary, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { CONTACT_TOPICS } from "@/lib/enquiry-topics";
import { phoneDigits, whatsappLink } from "@/lib/format";

export const metadata = { title: "Enquiry" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

/** Turns form field names such as "who_needs_care" into "Who needs care". */
const labelFor = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v));

export default async function EnquiryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const staff = await requirePermission("enquiries.view");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [{ data: e }, { data: notes }] = await Promise.all([
    staff.supabase.from("enquiries").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("enquiry_notes").select("id, body, created_at, author_id").eq("enquiry_id", id).order("created_at"),
  ]);
  if (!e) notFound();

  const authorIds = [...new Set((notes ?? []).map((n) => n.author_id).filter(Boolean))] as string[];
  const { data: authors } = authorIds.length
    ? await staff.supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorName = (aid: string | null) => authors?.find((a) => a.id === aid)?.full_name ?? "Staff member";

  const canEdit = staff.can("enquiries.edit");
  const payload = (e.payload && typeof e.payload === "object" && !Array.isArray(e.payload) ? e.payload : {}) as Record<string, unknown>;
  // Location fields are shown on the map card instead of in the list.
  const LOCATION_KEYS = new Set(["care_lat", "care_lng", "location_source", "location_accuracy_m", "care_address", "digital_address", "care_recipient_location"]);
  const details = Object.entries(payload).filter(([k, v]) => !LOCATION_KEYS.has(k) && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  const isCareRequest = e.enquiry_type === "care_request";
  const p = (k: string) => (typeof payload[k] === "string" ? (payload[k] as string) : null);
  const pinLat = typeof payload.care_lat === "number" ? payload.care_lat : null;
  const pinLng = typeof payload.care_lng === "number" ? payload.care_lng : null;
  const SOURCE: Record<string, string> = { gps: "their phone's location", map: "a pin they dropped on the map", search: "a place they searched for" };
  const { data: existingClient } = isCareRequest
    ? await staff.supabase.from("care_clients").select("id, full_name").eq("source_enquiry_id", e.id).maybeSingle()
    : { data: null };
  const canConvert = isCareRequest && !existingClient && staff.can("clients.create") && staff.can("enquiries.edit");
  const recipientName = p("care_recipient_name") || (p("who_needs_care") === "Myself" ? e.full_name : "");
  const summary = [
    Array.isArray(payload.support_types) ? `Support: ${(payload.support_types as string[]).join(", ")}` : null,
    p("frequency") ? `How often: ${p("frequency")}` : null,
    e.message,
  ]
    .filter(Boolean)
    .join("\n");
  const topic = CONTACT_TOPICS.find((t) => t.value === e.enquiry_type)?.label ?? e.enquiry_type;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/enquiries" className="text-sm font-medium text-brand-700 underline">
          ← All enquiries
        </Link>
      </p>
      {saved && <Notice>{saved === "note" ? "Note added." : "Status updated."}</Notice>}
      {error && <Notice tone="error">Something went wrong saving that. Please try again.</Notice>}
      <PageHeader title={e.full_name} intro={`${topic} · received ${formatDateTime(e.created_at)}`} actions={<StatusBadge status={e.status} />} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Message">
            {e.subject && <p className="mb-2 font-semibold text-brand-900">{e.subject}</p>}
            <p className="whitespace-pre-wrap">{e.message || <span className="text-muted">No message.</span>}</p>
          </Card>

          {isCareRequest && (p("care_recipient_location") || p("care_address") || p("digital_address") || pinLat != null) && (
            <Card title="Where care will happen">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {p("care_recipient_location") && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Town / area</dt>
                    <dd>{p("care_recipient_location")}</dd>
                  </div>
                )}
                {p("digital_address") && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Ghana Post digital address</dt>
                    <dd className="font-mono">{p("digital_address")}</dd>
                  </div>
                )}
                {p("care_address") && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">House address or directions</dt>
                    <dd className="whitespace-pre-line">{p("care_address")}</dd>
                  </div>
                )}
              </dl>
              {pinLat != null && pinLng != null ? (
                <div className="mt-4">
                  <iframe
                    title="Map of where care will happen"
                    src={mapsEmbed(pinLat, pinLng)}
                    className="h-64 w-full rounded-xl border border-gray-200"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <p className="mt-2 text-sm text-muted">
                    Pinned from {SOURCE[p("location_source") ?? ""] ?? "the form"}
                    {typeof payload.location_accuracy_m === "number" ? `, accurate to about ${payload.location_accuracy_m} m` : ""}.{" "}
                    <a href={mapsLink(pinLat, pinLng)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
                      Open in Google Maps ↗
                    </a>
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">No map pin was given. Ask for a Google Maps location when you call.</p>
              )}
            </Card>
          )}

          {details.length > 0 && (
            <Card title="Form details">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{labelFor(k)}</dt>
                    <dd className="text-ink">{show(v)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          <Card title="Internal notes">
            <div id="notes" className="scroll-mt-24" />
            {(notes ?? []).length === 0 ? (
              <p className="text-muted">No notes yet. Notes are only visible to staff.</p>
            ) : (
              <ol className="space-y-4">
                {(notes ?? []).map((n) => (
                  <li key={n.id} className="rounded-xl bg-gray-50 p-4">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-2 text-xs text-muted">
                      {authorName(n.author_id)} · {formatDateTime(n.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {canEdit && (
              <form action={addEnquiryNote} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={e.id} />
                <label className="block text-sm font-medium text-brand-900">
                  Add a note
                  <textarea name="body" required rows={3} maxLength={5000} className={adminInput} placeholder="e.g. Called back, consultation booked for Monday" />
                </label>
                <button type="submit" className={adminButton}>
                  Add note
                </button>
              </form>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Contact">
            <dl className="space-y-3 text-sm">
              {e.email && (
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd>
                    <a href={`mailto:${e.email}`} className="font-medium text-brand-700 underline">
                      {e.email}
                    </a>
                  </dd>
                </div>
              )}
              {e.phone && (
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="flex flex-wrap gap-3">
                    <a href={`tel:${phoneDigits(e.phone)}`} className="font-medium text-brand-700 underline">
                      {e.phone}
                    </a>
                    <a href={whatsappLink(e.phone)} target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 underline">
                      WhatsApp
                    </a>
                  </dd>
                </div>
              )}
              {e.country && (
                <div>
                  <dt className="text-muted">Country</dt>
                  <dd>{e.country}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Sent from page</dt>
                <dd>{e.source_page ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Consent given</dt>
                <dd>{e.consent_given ? `Yes (${e.consent_version})` : "No"}</dd>
              </div>
            </dl>
          </Card>

          {isCareRequest && existingClient && (
            <Card title="Client record">
              <p className="text-sm">
                Created from this request:{" "}
                <Link href={`/admin/care-clients/${existingClient.id}`} className="font-semibold text-brand-700 underline">
                  {existingClient.full_name}
                </Link>
              </p>
            </Card>
          )}

          {canConvert && (
            <Card title="Create client record">
              <p className="mb-3 text-sm text-muted">
                When you&apos;ve agreed to provide care, turn this request into a client. Check the details below; you can change them later.
              </p>
              <ActionForm action={createClientFromEnquiry} submitLabel="Create client record" inline>
                <input type="hidden" name="enquiry_id" value={e.id} />
                <input type="hidden" name="home_lat" value={pinLat ?? ""} />
                <input type="hidden" name="home_lng" value={pinLng ?? ""} />
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-brand-900">
                    Full name of the person who needs care
                    <input name="full_name" required maxLength={120} defaultValue={recipientName} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Name they like to be called
                    <input name="preferred_name" maxLength={60} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Area
                    <input name="area" maxLength={120} defaultValue={p("care_recipient_location") ?? ""} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    House address or directions
                    <input name="address" maxLength={300} defaultValue={p("care_address") ?? ""} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Ghana Post digital address
                    <input name="digital_address" maxLength={14} defaultValue={p("digital_address") ?? ""} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Care notes for the care worker
                    <textarea name="care_summary" rows={4} maxLength={2000} defaultValue={summary.slice(0, 2000)} className={adminInput} />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Emergency contact
                    <input
                      name="emergency_contact_name"
                      maxLength={120}
                      defaultValue={p("who_needs_care") && p("who_needs_care") !== "Myself" ? `${e.full_name} (asked for care: ${String(p("who_needs_care")).toLowerCase()})` : e.full_name}
                      className={adminInput}
                    />
                  </label>
                  <label className="block text-sm font-medium text-brand-900">
                    Emergency contact phone
                    <input name="emergency_contact_phone" maxLength={40} defaultValue={e.phone ?? ""} className={adminInput} />
                  </label>
                  <p className="text-xs text-muted">{pinLat != null ? "The map pin becomes the home location used to check care workers' visits." : "No map pin: you can add the home location on the client page later."}</p>
                </div>
              </ActionForm>
            </Card>
          )}

          {canEdit && (
            <Card title="Status">
              <form action={updateEnquiryStatus} className="space-y-3">
                <input type="hidden" name="id" value={e.id} />
                <label className="block text-sm font-medium text-brand-900">
                  Change status
                  <select name="status" defaultValue={e.status} className={adminInput}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={adminButtonSecondary}>
                  Save status
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
