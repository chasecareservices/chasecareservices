import Link from "next/link";
import { notFound } from "next/navigation";
import { inviteFamily, saveAssignments, saveCarePlan, saveClient, setFamilyAccess } from "../actions";
import { saveClientNeeds } from "../../care-workers/actions";
import { GenderSelect, LanguageChecks, SkillChecks } from "@/components/availability/MatchingFields";
import { skillLabel } from "@/lib/matching";
import { ClientFields } from "../ClientFields";
import { DocumentsPanel } from "@/components/admin/DocumentsPanel";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Notice, PageHeader, adminInput, formatDateTime } from "@/components/admin/ui";
import { ConcernBadge, Mood, formatVisitDate } from "@/components/portal/ReportBits";
import { requirePermission } from "@/lib/admin/session";
import { mapsEmbed, mapsLink } from "@/lib/care";

export const metadata = { title: "Client" };

export default async function CareClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const staff = await requirePermission("clients.view");
  const [{ data: client }, { data: team }, { data: workers }, { data: reports }, { data: plan }] = await Promise.all([
    staff.supabase.from("care_clients").select("*").eq("id", id).maybeSingle(),
    staff.supabase.from("care_assignments").select("worker_id").eq("client_id", id).eq("is_active", true),
    staff.supabase.rpc("list_care_workers"),
    staff.can("care_ops.view")
      ? staff.supabase.from("care_reports").select("id, visit_date, mood, concern_level, status").eq("client_id", id).order("visit_date", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    staff.supabase.from("care_plans").select("*").eq("client_id", id).maybeSingle(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const reviewDue = plan?.review_date && plan.review_date <= today;
  if (!client) notFound();
  const { data: familyContacts } = await staff.supabase.rpc("list_family_contacts", { client: id });
  const assigned = new Set((team ?? []).map((t) => t.worker_id));
  const canEdit = staff.can("clients.edit");

  return (
    <>
      {saved === "client" && <Notice>Client saved.</Notice>}
      {saved === "needs" && <Notice>Matching needs saved. They&apos;re used when you find a care worker for this client.</Notice>}
      {saved === "from-enquiry" && <Notice>Client record created from the care request. Next: write the care plan and choose the care team.</Notice>}
      {saved === "plan" && <Notice>Care plan saved. Care workers see it in their portal straight away.</Notice>}
      {saved === "team" && <Notice>Care team saved. Assigned care workers can now see this client in their portal.</Notice>}
      {saved === "family-invited" && <Notice>Invitation sent. Once they set a password, they can sign in to the family portal.</Notice>}
      {saved === "family-linked" && <Notice>They already had a family account, so they can see this client in their portal now.</Notice>}
      {saved === "family-on" && <Notice>Family access switched on.</Notice>}
      {saved === "family-off" && <Notice>Family access switched off. They can no longer see this client.</Notice>}
      <Link href="/admin/clients" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
        ← Clients
      </Link>
      <div className="mt-3">
        <PageHeader title={client.full_name} intro={client.area ?? undefined} />
      </div>

      <nav aria-label="On this page" className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          ["#care-plan", "Care plan"],
          ["#documents", "Documents"],
          ["#details", "Details & address"],
          ["#family", "Family access"],
          [`/admin/care-schedule`, "Visit schedule"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full bg-white px-4 py-2 font-semibold text-brand-800 ring-1 ring-gray-200 hover:bg-brand-50">
            {label}
          </a>
        ))}
      </nav>

      <section id="care-plan" className="mb-6 scroll-mt-24">
        <Card title="Care plan">
          {reviewDue && (
            <p role="alert" className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-950">
              <span aria-hidden="true">! </span>This care plan was due for review on {plan!.review_date}. Check it with the client and family, then
              set the next review date.
            </p>
          )}
          {!plan && <p className="mb-4 text-sm text-muted">No care plan yet. Care workers see what you write here before each visit.</p>}
          {plan && <p className="mb-4 text-xs text-muted">Last changed {formatDateTime(plan.updated_at)}. Earlier versions are in the Activity log.</p>}
          {canEdit ? (
            <ActionForm action={saveCarePlan} submitLabel="Save care plan" inline>
              <input type="hidden" name="client_id" value={client.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-brand-900 md:col-span-2">
                  About {client.preferred_name || client.full_name.split(" ")[0]}
                  <textarea name="about_me" rows={2} maxLength={2000} defaultValue={plan?.about_me ?? ""} placeholder="What matters to them: likes, routines, how they like to be supported." className={adminInput} />
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Tasks for every visit <span className="font-normal text-muted">(one per line)</span>
                  <textarea name="visit_tasks" rows={6} defaultValue={(plan?.visit_tasks ?? []).join("\n")} placeholder={"Help with washing and dressing\nPrepare lunch\nPrompt 1 pm medication"} className={adminInput} />
                  <span className="mt-1 block text-xs font-normal text-muted">Care workers tick these off in each report.</span>
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Goals <span className="font-normal text-muted">(one per line)</span>
                  <textarea name="goals" rows={6} defaultValue={(plan?.goals ?? []).join("\n")} placeholder={"Walk to the gate every day\nKeep blood sugar steady"} className={adminInput} />
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Needs and risks
                  <textarea name="risks" rows={3} maxLength={2000} defaultValue={plan?.risks ?? ""} placeholder="e.g. Falls risk on the step: walk on her left side." className={adminInput} />
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Medication notes
                  <textarea name="medication_notes" rows={3} maxLength={2000} defaultValue={plan?.medication_notes ?? ""} className={adminInput} />
                </label>
                <label className="text-sm font-medium text-brand-900">
                  Next review date
                  <input type="date" name="review_date" defaultValue={plan?.review_date ?? ""} className={adminInput} />
                </label>
              </div>
            </ActionForm>
          ) : plan ? (
            <div className="space-y-2 text-sm">
              {plan.about_me && <p>{plan.about_me}</p>}
              <p><strong>Each visit:</strong> {plan.visit_tasks.join(" · ") || "—"}</p>
              <p><strong>Goals:</strong> {plan.goals.join(" · ") || "—"}</p>
              {plan.risks && <p><strong>Needs and risks:</strong> {plan.risks}</p>}
              {plan.medication_notes && <p><strong>Medication:</strong> {plan.medication_notes}</p>}
            </div>
          ) : null}
        </Card>
      </section>

      <div className="mb-6">
        <DocumentsPanel owner={{ kind: "client", id: client.id, name: client.full_name }} />
      </div>

      <div id="details" className="grid scroll-mt-24 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card title="Details">
          {canEdit ? (
            <ActionForm action={saveClient} submitLabel="Save details" inline>
              <input type="hidden" name="id" value={client.id} />
              <ClientFields client={client} showActive />
            </ActionForm>
          ) : (
            <p className="whitespace-pre-line">{client.care_summary ?? "No care notes yet."}</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Home location">
            {client.home_lat != null && client.home_lng != null ? (
              <>
                <iframe
                  title={`Map of ${client.full_name}'s home`}
                  src={mapsEmbed(client.home_lat, client.home_lng)}
                  loading="lazy"
                  className="h-48 w-full rounded-xl border-0 ring-1 ring-gray-200"
                />
                <a href={mapsLink(client.home_lat, client.home_lng)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">
                  Open in Google Maps ↗
                </a>
              </>
            ) : (
              <p className="text-sm text-muted">Not set. Visit reports can&apos;t be checked against the home until it is. Add it in the details form.</p>
            )}
          </Card>

          <section id="needs" className="scroll-mt-24">
            <Card title="Matching needs">
              <p className="text-sm">
                {client.required_skills.length ? client.required_skills.map(skillLabel).join(", ") : "No special skills recorded."}
                {client.preferred_gender ? ` · Prefers a ${client.preferred_gender} carer` : ""}
                {client.languages.length ? ` · Speaks ${client.languages.join(", ")}` : ""}
              </p>
              {staff.can("care_ops.view") && (
                <Link href={`/admin/matching?client=${client.id}`} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                  Find a care worker
                </Link>
              )}
              {canEdit && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-800">Edit matching needs</summary>
                  <div className="mt-3">
                    <ActionForm action={saveClientNeeds} submitLabel="Save needs" inline>
                      <input type="hidden" name="client_id" value={client.id} />
                      <div className="space-y-4">
                        <SkillChecks name="required_skills" selected={client.required_skills} legend="Skills the care worker needs" />
                        <GenderSelect name="preferred_gender" value={client.preferred_gender} label="Preferred carer" emptyLabel="No preference" />
                        <LanguageChecks selected={client.languages} legend="Languages the client speaks" />
                      </div>
                    </ActionForm>
                  </div>
                </details>
              )}
            </Card>
          </section>

          <Card title="Care team">
            {!workers?.length ? (
              <p className="text-sm text-muted">
                No care workers yet.{" "}
                <Link href="/admin/care-workers" className="font-semibold text-brand-700 underline">
                  Invite one
                </Link>
                .
              </p>
            ) : canEdit ? (
              <ActionForm action={saveAssignments} submitLabel="Save care team" inline>
                <input type="hidden" name="client_id" value={client.id} />
                <fieldset>
                  <legend className="text-sm text-muted">Tick everyone who visits {client.preferred_name || client.full_name.split(" ")[0]}.</legend>
                  <div className="mt-2 space-y-1">
                    {workers.map((w) => (
                      <label key={w.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-brand-50">
                        <input type="checkbox" name="worker_id" value={w.id} defaultChecked={assigned.has(w.id)} disabled={!w.is_active && !assigned.has(w.id)} className="h-5 w-5 accent-brand-800" />
                        <span>
                          {w.full_name ?? w.email}
                          {!w.is_active && <span className="ml-1 text-xs text-muted">(switched off)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </ActionForm>
            ) : (
              <ul className="text-sm">{workers.filter((w) => assigned.has(w.id)).map((w) => <li key={w.id}>{w.full_name}</li>)}</ul>
            )}
          </Card>

          <section id="family" className="scroll-mt-24">
            <Card title="Family portal access">
              <p className="text-sm text-muted">
                Family can see booked visits, reports you have read, and the care plan. They never see visit locations, concerns, office notes or incidents.
              </p>
              {familyContacts?.length ? (
                <ul className="mt-3 divide-y divide-gray-100 text-sm">
                  {familyContacts.map((f) => (
                    <li key={f.link_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span>
                        <span className="font-semibold text-brand-900">{f.full_name ?? f.email}</span>
                        {f.relationship && <span className="text-muted"> · {f.relationship}</span>}
                        <span className="block text-xs text-muted">
                          {f.email} · {f.last_sign_in_at ? `last signed in ${formatDateTime(f.last_sign_in_at)}` : "hasn't signed in yet"}
                          {!f.is_active && " · access off"}
                        </span>
                      </span>
                      {canEdit && (
                        <ActionForm
                          action={setFamilyAccess}
                          submitLabel={f.is_active ? "Switch off" : "Switch on"}
                          secondary
                          confirm={f.is_active ? `Stop ${f.full_name ?? f.email} seeing this client?` : undefined}
                        >
                          <input type="hidden" name="link_id" value={f.link_id} />
                          <input type="hidden" name="client_id" value={client.id} />
                          <input type="hidden" name="active" value={f.is_active ? "false" : "true"} />
                        </ActionForm>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">No family members yet.</p>
              )}
              {canEdit && (
                <details className="mt-4 rounded-xl bg-brand-50 px-4 py-3">
                  <summary className="min-h-8 cursor-pointer font-semibold text-brand-800">Invite a family member</summary>
                  <div className="mt-3">
                    <ActionForm action={inviteFamily} submitLabel="Send invitation" inline>
                      <input type="hidden" name="client_id" value={client.id} />
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-brand-900">
                          Full name
                          <input name="full_name" required maxLength={120} className={adminInput} />
                        </label>
                        <label className="block text-sm font-medium text-brand-900">
                          Email
                          <input name="email" type="email" required className={adminInput} />
                        </label>
                        <label className="block text-sm font-medium text-brand-900">
                          Relationship to {client.preferred_name || client.full_name.split(" ")[0]}
                          <select name="relationship" required defaultValue="" className={adminInput}>
                            <option value="" disabled>
                              Choose…
                            </option>
                            {["Daughter", "Son", "Wife", "Husband", "Mother", "Father", "Sister", "Brother", "Grandchild", "Guardian", "Friend", "Other"].map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </label>
                        <p className="text-xs text-muted">Only invite people the client (or their legal guardian) has agreed can see their care.</p>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              )}
            </Card>
          </section>

          {staff.can("care_ops.view") && (
            <Card title="Recent reports">
              {!reports?.length ? (
                <p className="text-sm text-muted">No reports yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {reports.map((r) => (
                    <li key={r.id}>
                      <Link href={`/admin/care-reports/${r.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-brand-50">
                        <span>
                          {formatVisitDate(r.visit_date)} · <Mood mood={r.mood} />
                        </span>
                        <span className="flex items-center gap-1">
                          <ConcernBadge level={r.concern_level} />
                          {r.status === "submitted" && <span className="rounded-full bg-accent-100 px-2 text-xs font-bold text-accent-700">New</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
