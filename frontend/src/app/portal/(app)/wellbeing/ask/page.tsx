import { askForSupport } from "@/app/portal/wellbeing-actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { requireWorker } from "@/lib/portal/session";
import { CONTACT_METHODS, SUPPORT_KINDS, URGENCY } from "@/lib/wellbeing";

export const metadata = { title: "Ask for support" };

const choice =
  "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 border-brand-100 bg-white px-4 py-3 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-700";
const input = "mt-1 block w-full rounded-xl border border-brand-200 bg-white px-4 py-3 text-base focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  await requireWorker();
  const preset = SUPPORT_KINDS.some((k) => k.value === kind) ? kind : undefined;
  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-900">Ask for support</h1>
      <p className="mt-1 text-muted">
        Only the ChaseCare wellbeing team will read this. It isn&apos;t shared with your clients, and it won&apos;t affect your work with us.
      </p>
      <div role="note" className="mt-4 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-950">
        <p className="font-semibold">If you are in danger or thinking of harming yourself, don&apos;t wait.</p>
        <p>
          Call <a href="tel:112" className="font-semibold underline">112</a> now, or go to the nearest hospital emergency department.
        </p>
      </div>

      <ActionForm action={askForSupport} submitLabel="Send in confidence" pendingLabel="Sending…" className="mt-6 space-y-6 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <fieldset>
          <legend className="text-lg font-semibold text-brand-900">What kind of support?</legend>
          <div className="mt-2 space-y-2">
            {SUPPORT_KINDS.map((k) => (
              <label key={k.value} className={choice}>
                <input type="radio" name="kind" value={k.value} required defaultChecked={k.value === preset} className="mt-1 h-5 w-5 accent-brand-800" />
                <span>
                  <span className="block font-semibold text-brand-900">{k.label}</span>
                  <span className="block text-sm text-muted">{k.help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="message" className="text-lg font-semibold text-brand-900">
            Tell us a little about it
          </label>
          <p id="message-hint" className="text-sm text-muted">
            As much or as little as you like. A sentence is enough.
          </p>
          <textarea id="message" name="message" required rows={5} maxLength={4000} aria-describedby="message-hint" className={input} />
        </div>

        <fieldset>
          <legend className="text-lg font-semibold text-brand-900">How soon would you like to hear from us?</legend>
          <div className="mt-2 space-y-2">
            {URGENCY.map((u) => (
              <label key={u.value} className={choice}>
                <input type="radio" name="urgency" value={u.value} required defaultChecked={u.value === "routine"} className="mt-1 h-5 w-5 accent-brand-800" />
                <span>
                  <span className="block font-semibold text-brand-900">{u.label}</span>
                  <span className="block text-sm text-muted">{u.help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-semibold text-brand-900">How should we contact you?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CONTACT_METHODS.map((c) => (
              <label key={c.value} className={choice}>
                <input type="radio" name="contact_method" value={c.value} required defaultChecked={c.value === "phone"} className="mt-1 h-5 w-5 accent-brand-800" />
                <span className="font-semibold text-brand-900">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="contact_times" className="text-lg font-semibold text-brand-900">
            Best times to reach you <span className="text-sm font-normal text-muted">(optional)</span>
          </label>
          <input id="contact_times" name="contact_times" maxLength={200} placeholder="e.g. Weekday evenings after 6pm" className={input} />
        </div>
      </ActionForm>
    </div>
  );
}
