import { INCIDENT_KINDS, INCIDENT_SEVERITIES, PEOPLE_TOLD } from "@/lib/incidents";

const field = "mt-1 block w-full min-h-12 rounded-xl border-2 border-brand-200 bg-white px-3 text-base text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200";
const legend = "text-base font-semibold text-brand-900";
const choice =
  "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 border-brand-100 bg-white px-3 py-2 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400";

/**
 * The questions on an incident report, in the order a person tells the story:
 * who, when, what kind, how bad, what happened, what you did, who you told.
 * Used by care workers in the portal and by the office in the dashboard.
 */
export function IncidentFields({
  clients,
  clientId,
  nowLocal,
}: {
  clients: { id: string; name: string }[];
  clientId?: string;
  nowLocal: string;
}) {
  return (
    <div className="space-y-6">
      <label className="block">
        <span className={legend}>Who did it happen to?</span>
        <select name="client_id" required defaultValue={clientId ?? (clients.length === 1 ? clients[0].id : "")} className={field}>
          <option value="" disabled>
            Choose…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={legend}>When did it happen?</span>
          <input type="datetime-local" name="occurred_at" required defaultValue={nowLocal} max={nowLocal} className={field} />
        </label>
        <label className="block">
          <span className={legend}>
            Where? <span className="font-normal text-muted">(optional)</span>
          </span>
          <input name="place" maxLength={200} placeholder="e.g. Bathroom, at home" className={field} />
        </label>
      </div>

      <fieldset>
        <legend className={legend}>What kind of incident?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INCIDENT_KINDS.map((k) => (
            <label key={k.value} className={choice}>
              <input type="radio" name="kind" value={k.value} required className="mt-1 h-5 w-5 accent-brand-700" />
              <span>
                <span className="block font-semibold text-brand-900">{k.label}</span>
                {k.hint && <span className="block text-sm text-muted">{k.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>How serious was it?</legend>
        <div className="mt-2 grid gap-2">
          {INCIDENT_SEVERITIES.map((s) => (
            <label key={s.value} className={choice}>
              <input type="radio" name="severity" value={s.value} required className="mt-1 h-5 w-5 accent-brand-700" />
              <span>
                <span className="block font-semibold text-brand-900">{s.label}</span>
                <span className="block text-sm text-muted">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={legend}>What happened?</span>
        <span className="block text-sm text-muted">Just the facts, in your own words: what you saw and heard.</span>
        <textarea name="what_happened" required minLength={10} maxLength={4000} rows={5} className={`${field} py-2`} />
      </label>

      <label className="block">
        <span className={legend}>What did you do straight away?</span>
        <textarea name="action_taken" required maxLength={4000} rows={3} placeholder="e.g. Helped her sit down, checked for injuries, called her daughter." className={`${field} py-2`} />
      </label>

      <fieldset>
        <legend className={legend}>
          Who have you told? <span className="font-normal text-muted">(tick all)</span>
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {PEOPLE_TOLD.map((p) => (
            <label key={p.value} className={`${choice} items-center`}>
              <input type="checkbox" name="people_told" value={p.value} className="h-5 w-5 accent-brand-700" />
              <span className="font-semibold text-brand-900">{p.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={legend}>
          Anyone else who saw it? <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="witnesses" maxLength={500} placeholder="Name and how they know the client" className={field} />
      </label>
    </div>
  );
}

/** Reads the incident questions back out of a submitted form. */
export function incidentFromForm(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? "");
  return {
    client_id: s("client_id"),
    occurred_at: s("occurred_at"),
    place: s("place"),
    kind: s("kind"),
    severity: s("severity"),
    what_happened: s("what_happened"),
    action_taken: s("action_taken"),
    people_told: formData.getAll("people_told").map(String),
    witnesses: s("witnesses"),
  };
}
