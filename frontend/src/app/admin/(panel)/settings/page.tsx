import type { ReactNode } from "react";
import { saveSettings } from "./actions";
import { disconnectDrive, saveAlertRecipients, sendTestEmail } from "./alert-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { ALERT_TOPICS } from "@/lib/email/notify";
import { emailTransport } from "@/lib/email/send";
import { driveConfigured } from "@/lib/drive/google";
import { SOCIAL_NETWORKS } from "./fields";
import { Card, Notice, PageHeader, adminButton, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Site settings" };

type Row = Record<string, string>;
const asRows = (v: unknown): Row[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : []);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-brand-900">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

const DRIVE_NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  connected: { tone: "success", text: "Google Drive connected. Documents will be kept in the \"Chase Care Documents\" folder." },
  disconnected: { tone: "info", text: "Google Drive disconnected. The files are still in Drive; the website no longer uses it." },
  cancelled: { tone: "info", text: "Google Drive wasn't connected: the sign-in was cancelled." },
  "no-refresh": { tone: "error", text: "Google didn't give lasting access. Remove \"Chase Care Website\" from your Google Account's third-party connections, then connect again." },
  "no-permission": { tone: "error", text: "Google Drive access wasn't allowed. Connect again and tick the Google Drive box." },
  "not-configured": { tone: "error", text: "Google Drive isn't set up yet: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET need adding in Vercel." },
  failed: { tone: "error", text: "Google Drive couldn't be connected. Please try again." },
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; drive?: string }> }) {
  const { saved, error, drive } = await searchParams;
  const staff = await requirePermission("settings.view");
  const [{ data: s }, { data: alertRows }] = await Promise.all([
    staff.supabase.from("site_settings").select("*").maybeSingle(),
    staff.supabase.from("notification_recipients").select("topic, email").order("email"),
  ]);
  const alertList = (topic: string) => (alertRows ?? []).filter((r) => r.topic === topic).map((r) => r.email).join("\n");
  const emailVia = emailTransport();
  const [{ data: driveRows }] = await Promise.all([staff.supabase.rpc("drive_status")]);
  const driveStatus = driveRows?.[0];
  const driveReady = driveConfigured();
  if (!s) return <Notice tone="error">Could not load the site settings.</Notice>;

  const canEdit = staff.can("settings.edit");
  const hours = asRows(s.opening_hours);
  const impact = asRows(s.impact_stats);
  const recognition = asRows(s.recognitions);
  const social = (s.social_links && typeof s.social_links === "object" ? s.social_links : {}) as Row;

  return (
    <>
      {drive && DRIVE_NOTICES[drive] && <Notice tone={DRIVE_NOTICES[drive].tone}>{DRIVE_NOTICES[drive].text}</Notice>}
      {saved === "alerts" && <Notice>Alert emails saved.</Notice>}
      {saved === "test-email" && <Notice>Test email sent to {staff.user.email}. Check that inbox (and the spam folder).</Notice>}
      {saved && saved !== "alerts" && saved !== "test-email" && <Notice>Settings saved. The website has been updated.</Notice>}
      {error === "email" && <Notice tone="error">Please enter a valid email address.</Notice>}
      {error === "save" && <Notice tone="error">The settings could not be saved. Please try again.</Notice>}
      <PageHeader title="Site settings" intro={`Contact details and information shown across the website. Last changed ${formatDateTime(s.updated_at)}.`} />

      <form action={saveSettings}>
        <fieldset disabled={!canEdit} className="space-y-6">
          <Card title="Organisation">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Organisation name">
                <input name="organisation_name" defaultValue={s.organisation_name} required maxLength={120} className={adminInput} />
              </Field>
              <Field label="Tagline">
                <input name="tagline" defaultValue={s.tagline} required maxLength={200} className={adminInput} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Short description" hint="Shown in the footer.">
                  <textarea name="supporting_statement" defaultValue={s.supporting_statement ?? ""} rows={2} maxLength={500} className={adminInput} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Contact details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone" hint="Include the country code, e.g. +233 24 123 4567">
                <input name="phone" defaultValue={s.phone ?? ""} maxLength={40} className={adminInput} />
              </Field>
              <Field label="WhatsApp number" hint="Used for the WhatsApp buttons.">
                <input name="whatsapp_number" defaultValue={s.whatsapp_number ?? ""} maxLength={40} className={adminInput} />
              </Field>
              <Field label="Email">
                <input name="email" type="email" defaultValue={s.email ?? ""} maxLength={200} className={adminInput} />
              </Field>
              <Field label="Address">
                <input name="address" defaultValue={s.address ?? ""} maxLength={300} className={adminInput} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Map link" hint="Paste a Google Maps link to your location.">
                  <input name="map_url" type="url" defaultValue={s.map_url ?? ""} maxLength={500} className={adminInput} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Opening hours">
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-2">
                  <Field label={`Days ${i + 1}`}>
                    <input name={`hours_days_${i}`} defaultValue={hours[i]?.days ?? ""} placeholder="e.g. Monday – Friday" className={adminInput} />
                  </Field>
                  <Field label={`Hours ${i + 1}`}>
                    <input name={`hours_hours_${i}`} defaultValue={hours[i]?.hours ?? ""} placeholder="e.g. 08:00 – 17:00" className={adminInput} />
                  </Field>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Social media">
            <div className="grid gap-4 md:grid-cols-2">
              {SOCIAL_NETWORKS.map((n) => (
                <Field key={n.key} label={n.label}>
                  <input name={`social_${n.key}`} type="url" defaultValue={social[n.key] ?? ""} placeholder="https://…" className={adminInput} />
                </Field>
              ))}
            </div>
          </Card>

          <Card title="Impact numbers">
            <p className="mb-4 text-sm text-muted">
              Key figures shown on the homepage and About page. Leave empty to hide them. Only use figures you can back up.
            </p>
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr]">
                  <Field label={`Figure ${i + 1}`}>
                    <input name={`impact_value_${i}`} defaultValue={impact[i]?.value ?? ""} placeholder="350+" className={adminInput} />
                  </Field>
                  <Field label="Label">
                    <input name={`impact_label_${i}`} defaultValue={impact[i]?.label ?? ""} placeholder="Families supported" className={adminInput} />
                  </Field>
                  <Field label="Detail (optional)">
                    <input name={`impact_detail_${i}`} defaultValue={impact[i]?.detail ?? ""} placeholder="since 2020" className={adminInput} />
                  </Field>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recognition">
            <p className="mb-4 text-sm text-muted">Accreditations, memberships and awards for the About page. Leave empty to hide.</p>
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[2fr_6rem_2fr]">
                  <Field label={`Name ${i + 1}`}>
                    <input name={`recognition_name_${i}`} defaultValue={recognition[i]?.name ?? ""} className={adminInput} />
                  </Field>
                  <Field label="Year">
                    <input name={`recognition_year_${i}`} defaultValue={recognition[i]?.year ?? ""} maxLength={9} className={adminInput} />
                  </Field>
                  <Field label="Detail (optional)">
                    <input name={`recognition_detail_${i}`} defaultValue={recognition[i]?.detail ?? ""} className={adminInput} />
                  </Field>
                </div>
              ))}
            </div>
          </Card>

          {canEdit ? (
            <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-gray-50/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
              <button type="submit" className={adminButton}>
                Save settings
              </button>
            </div>
          ) : (
            <Notice tone="info">You can view these settings but not change them.</Notice>
          )}
        </fieldset>
      </form>

      <section id="email-alerts" className="mt-10 scroll-mt-24">
        <Card title="Email alerts">
          {emailVia ? (
            <p className="mb-4 text-sm text-green-800">
              ✓ Email sending is switched on ({emailVia === "smtp" ? `through ${process.env.SMTP_USER}` : "through Resend"}).
            </p>
          ) : (
            <Notice tone="info">
              Email sending isn&apos;t switched on yet: add SMTP_USER and SMTP_PASS (e.g. the office Gmail and an App Password) in
              Vercel&apos;s settings. Until then no alerts are sent, but everything still appears in the dashboard.
            </Notice>
          )}
          {canEdit && emailVia && (
            <div className="mb-4">
              <ActionForm action={sendTestEmail} submitLabel={`Send a test email to ${staff.user.email}`} pendingLabel="Sending…" secondary inline>
                <span />
              </ActionForm>
            </div>
          )}
          <p className="mb-4 text-sm text-muted">
            Who is emailed when something needs attention. One address per line. If a box is empty, alerts go to the contact email above
            ({s.email ?? "not set"}).
          </p>
          {canEdit ? (
            <ActionForm action={saveAlertRecipients} submitLabel="Save alert emails" inline>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="New enquiries (care requests, job applications, contact form…)">
                  <textarea name="enquiries" rows={3} defaultValue={alertList(ALERT_TOPICS.enquiries)} placeholder="office@example.com" className={adminInput} />
                </Field>
                <Field label="Care reports with a concern (urgent or “keep an eye on it”)" hint="The email says who and when; the details stay in the dashboard for privacy.">
                  <textarea name="care_concerns" rows={3} defaultValue={alertList(ALERT_TOPICS.careConcerns)} placeholder="care.manager@example.com" className={adminInput} />
                </Field>
                <Field label="Wellbeing Hub requests from care workers" hint="Confidential: the email gives only a reference. Use the wellbeing officer's address.">
                  <textarea name="wellbeing" rows={3} defaultValue={alertList(ALERT_TOPICS.wellbeing)} placeholder="wellbeing@example.com" className={adminInput} />
                </Field>
              </div>
            </ActionForm>
          ) : (
            <p className="text-sm">
              Enquiries: {alertList(ALERT_TOPICS.enquiries) || "the contact email"} · Care concerns: {alertList(ALERT_TOPICS.careConcerns) || "the contact email"} · Wellbeing: {alertList(ALERT_TOPICS.wellbeing) || "the contact email"}
            </p>
          )}
        </Card>
      </section>

      <section id="documents" className="mt-10 scroll-mt-24">
        <Card title="Documents (Google Drive)">
          {driveStatus?.connected ? (
            <>
              <p className="text-sm text-green-800">
                ✓ Connected to <strong>{driveStatus.account_email}</strong> since {formatDateTime(driveStatus.connected_at)}.
              </p>
              <p className="mt-2 text-sm text-muted">
                Client and care worker documents are kept in that account&apos;s Google Drive, in the &ldquo;Chase Care Documents&rdquo; folder. The website can only see the files it put there.
              </p>
              {canEdit && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* A full page load on purpose: this hands over to Google's sign-in. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a href="/api/google/connect" className="inline-flex min-h-11 items-center rounded-full border-2 border-brand-800 px-5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                    Reconnect
                  </a>
                  <ActionForm action={disconnectDrive} submitLabel="Disconnect" secondary inline confirm="Disconnect Google Drive? Files stay in Drive, but nobody can upload or open them from the dashboard until it's connected again.">
                    <span />
                  </ActionForm>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-ink">
                Connect the company Google account once. Client and care worker documents (PDFs, Word files, photos) are then kept in its Google Drive, and only office staff can open them
                from the dashboard.
              </p>
              {!driveReady && (
                <p className="mt-2 text-sm text-amber-900">
                  First, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET need adding in Vercel (from Google Cloud). Ask your developer for the steps.
                </p>
              )}
              {canEdit && driveReady && (
                <>
                  {/* A full page load on purpose: this hands over to Google's sign-in. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a href="/api/google/connect" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700">
                    Connect Google Drive
                  </a>
                </>
              )}
            </>
          )}
        </Card>
      </section>

    </>
  );
}
