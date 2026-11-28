import { adminInput } from "@/components/admin/ui";
import { toLocalInput } from "@/lib/admin/values";
import { EVENT_KINDS, FORUM_TOPICS } from "@/lib/events";

type EventValues = {
  title?: string;
  kind?: string;
  topic?: string | null;
  summary?: string | null;
  description?: string | null;
  speaker?: string | null;
  starts_at?: string;
  ends_at?: string | null;
  venue?: string | null;
  online?: boolean;
  capacity?: number | null;
  registration_open?: boolean;
  status?: string;
};

const label = "block text-sm font-medium text-brand-900";

/** The fields of an event, for both "Add an event" and "Edit". */
export function EventFields({ e = {}, onlineUrl = "" }: { e?: EventValues; onlineUrl?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className={`${label} md:col-span-2`}>
        Title
        <input name="title" required maxLength={200} defaultValue={e.title ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Type
        <select name="kind" defaultValue={e.kind ?? "community"} className={adminInput}>
          {EVENT_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Topic
        <input name="topic" list="forum-topics" maxLength={120} defaultValue={e.topic ?? ""} className={adminInput} />
        <datalist id="forum-topics">
          {FORUM_TOPICS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <label className={label}>
        Starts (Ghana time)
        <input name="starts_at" type="datetime-local" required defaultValue={toLocalInput(e.starts_at)} className={adminInput} />
      </label>
      <label className={label}>
        Ends (optional)
        <input name="ends_at" type="datetime-local" defaultValue={toLocalInput(e.ends_at)} className={adminInput} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Summary
        <span className="block text-xs font-normal text-muted">One or two sentences for the events list.</span>
        <textarea name="summary" rows={2} maxLength={400} defaultValue={e.summary ?? ""} className={adminInput} />
      </label>
      <label className={`${label} md:col-span-2`}>
        Description
        <textarea name="description" rows={5} maxLength={5000} defaultValue={e.description ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Speaker(s)
        <input name="speaker" maxLength={300} defaultValue={e.speaker ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Venue
        <input name="venue" maxLength={300} defaultValue={e.venue ?? ""} placeholder="e.g. Chase Care office, Accra" className={adminInput} />
      </label>
      <label className={label}>
        Places in the room
        <span className="block text-xs font-normal text-muted">Leave empty for no limit. Online places are never limited.</span>
        <input name="capacity" type="number" min={1} defaultValue={e.capacity ?? ""} className={adminInput} />
      </label>
      <label className={label}>
        Status
        <select name="status" defaultValue={e.status ?? "draft"} className={adminInput}>
          <option value="draft">Draft (hidden)</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled (shown as cancelled)</option>
          <option value="archived">Archived (hidden)</option>
        </select>
      </label>
      <fieldset className="space-y-2 md:col-span-2">
        <legend className="text-sm font-medium text-brand-900">Joining</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="registration_open" defaultChecked={e.registration_open ?? true} className="h-5 w-5 accent-brand-800" />
          Registration is open
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="online" defaultChecked={e.online ?? false} className="h-5 w-5 accent-brand-800" />
          People can also join online (video call)
        </label>
      </fieldset>
      <label className={`${label} md:col-span-2`}>
        Online joining link
        <span className="block text-xs font-normal text-muted">
          Zoom, Google Meet or Teams link starting with https://. It is never shown on the website: it is emailed to people who register to join online.
        </span>
        <input name="online_url" type="url" maxLength={500} defaultValue={onlineUrl} placeholder="https://meet.google.com/…" className={adminInput} />
      </label>
    </div>
  );
}
