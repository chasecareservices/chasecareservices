import { adminInput } from "@/components/admin/ui";

type Client = {
  full_name?: string;
  preferred_name?: string | null;
  area?: string | null;
  care_summary?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  is_active?: boolean;
};

/** The client form fields, shared by "Add a client" and the client page. */
export function ClientFields({ client = {}, showActive = false }: { client?: Client; showActive?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium text-brand-900">
        Full name <span className="text-red-700">*</span>
        <input name="full_name" required maxLength={120} defaultValue={client.full_name ?? ""} className={adminInput} />
      </label>
      <label className="text-sm font-medium text-brand-900">
        Name they like to be called
        <input name="preferred_name" maxLength={60} defaultValue={client.preferred_name ?? ""} placeholder="e.g. Auntie Akosua" className={adminInput} />
      </label>
      <label className="text-sm font-medium text-brand-900">
        Area
        <input name="area" maxLength={120} defaultValue={client.area ?? ""} placeholder="e.g. Spintex Road" className={adminInput} />
      </label>
      <span className="hidden md:block" />
      <label className="text-sm font-medium text-brand-900 md:col-span-2">
        Care notes for the care worker
        <textarea
          name="care_summary"
          rows={4}
          maxLength={2000}
          defaultValue={client.care_summary ?? ""}
          placeholder="What the care worker needs to know: conditions, routines, likes, risks."
          className={adminInput}
        />
        <span className="mt-1 block text-xs font-normal text-muted">Care workers assigned to this client can read these notes in their portal.</span>
      </label>
      <label className="text-sm font-medium text-brand-900">
        Emergency contact
        <input name="emergency_contact_name" maxLength={120} defaultValue={client.emergency_contact_name ?? ""} placeholder="e.g. Yaw Boateng (son)" className={adminInput} />
      </label>
      <label className="text-sm font-medium text-brand-900">
        Emergency contact phone
        <input name="emergency_contact_phone" type="tel" maxLength={40} defaultValue={client.emergency_contact_phone ?? ""} className={adminInput} />
      </label>
      {showActive && (
        <label className="flex items-center gap-2 text-sm font-medium text-brand-900 md:col-span-2">
          <input type="checkbox" name="is_active" defaultChecked={client.is_active !== false} className="h-5 w-5 accent-brand-800" />
          Receiving care now (untick when care ends; their reports are kept)
        </label>
      )}
    </div>
  );
}
