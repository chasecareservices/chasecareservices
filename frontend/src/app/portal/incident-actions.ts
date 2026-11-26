"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { incidentFromForm } from "@/components/care/IncidentFields";
import { notifyIncident } from "@/lib/email/notify";
import { validateIncident } from "@/lib/incidents";
import { requireWorker } from "@/lib/portal/session";

/** A care worker reports an incident. The office is emailed straight away. */
export async function reportIncident(formData: FormData): Promise<{ error: string } | undefined> {
  const worker = await requireWorker();
  const checked = validateIncident(incidentFromForm(formData));
  if ("error" in checked) return checked;
  const { data, error } = await worker.supabase
    .from("care_incidents")
    .insert({ ...checked.value, reported_by: worker.user.id })
    .select("id")
    .single();
  if (error || !data) {
    return {
      error: /row-level security/i.test(error?.message ?? "")
        ? "You can only report incidents for the people you look after. Please call the office."
        : "The incident could not be sent. Check your connection and try again — if it's serious, call the office now.",
    };
  }
  await notifyIncident(data.id).catch(() => undefined);
  revalidatePath("/portal", "layout");
  redirect(`/portal/incident/${data.id}?sent=1`);
}
