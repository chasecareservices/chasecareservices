"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server-auth";

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/** Signed out automatically after a period with no activity (Security settings). */
export async function signOutIdle() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login?error=idle");
}
