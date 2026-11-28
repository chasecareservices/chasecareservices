"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorker } from "@/lib/portal/session";

export async function acknowledgePolicy(formData: FormData): Promise<{ error: string } | undefined> {
  const worker = await requireWorker();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "Something went wrong. Please reload the page." };
  const { error } = await worker.supabase.rpc("acknowledge_policy", { policy: id });
  if (error) return { error: "That couldn't be saved. Please try again." };
  revalidatePath("/portal", "layout");
  redirect(`/portal/policies/${id}?read=1`);
}
