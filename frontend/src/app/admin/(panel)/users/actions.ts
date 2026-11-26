"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { createSecretClient } from "@/lib/supabase/server-auth";

const UUID = /^[0-9a-f-]{36}$/;

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function inviteStaff(formData: FormData) {
  const staff = await requirePermission("users.edit");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 200);
  const role = String(formData.get("role") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fullName || !role) redirect("/admin/users?error=invite-fields");

  // Check the role exists and that this person may grant it, before sending any email.
  const { data: roleRow } = await staff.supabase.from("roles").select("key, is_staff").eq("key", role).maybeSingle();
  if (!roleRow?.is_staff) redirect("/admin/users?error=invite-role");
  if (role === "super_admin") {
    const { data: isSuper } = await staff.supabase.rpc("current_user_has_role", { role: "super_admin" });
    if (!isSuper) redirect("/admin/users?error=super-only");
  }

  const admin = createSecretClient();
  if (!admin) redirect("/admin/users?error=no-secret");

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${await siteOrigin()}/admin/set-password`,
  });
  if (error || !data.user) {
    redirect(`/admin/users?error=${/already|registered|exists/i.test(error?.message ?? "") ? "invite-exists" : "invite-failed"}`);
  }

  // Grant the role as the signed-in staff member, so the database's own rules apply.
  const { error: roleError } = await staff.supabase.from("user_roles").insert({ user_id: data.user.id, role_key: role });
  redirect(`/admin/users?${roleError ? "error=invite-role-grant" : `saved=invited&who=${encodeURIComponent(email)}`}`);
}

export async function updateRoles(formData: FormData) {
  const staff = await requirePermission("users.edit");
  const userId = String(formData.get("user_id") ?? "");
  if (!UUID.test(userId)) redirect("/admin/users?error=save");
  const wanted = new Set(formData.getAll("roles").map(String));

  const [{ data: current }, { data: staffRoles }] = await Promise.all([
    staff.supabase.from("user_roles").select("role_key").eq("user_id", userId),
    staff.supabase.from("roles").select("key").eq("is_staff", true),
  ]);
  const staffKeys = new Set((staffRoles ?? []).map((r) => r.key));
  const have = new Set((current ?? []).map((r) => r.role_key).filter((k) => staffKeys.has(k)));
  const toAdd = [...wanted].filter((k) => staffKeys.has(k) && !have.has(k));
  const toRemove = [...have].filter((k) => !wanted.has(k));

  for (const role_key of toAdd) {
    const { error } = await staff.supabase.from("user_roles").insert({ user_id: userId, role_key });
    if (error) redirect(`/admin/users?error=${role_key === "super_admin" ? "super-only" : "save"}`);
  }
  for (const role_key of toRemove) {
    const { error, count } = await staff.supabase.from("user_roles").delete({ count: "exact" }).eq("user_id", userId).eq("role_key", role_key);
    if (error) redirect(`/admin/users?error=${/last active super admin/i.test(error.message) ? "last-super" : "save"}`);
    if (count === 0) redirect(`/admin/users?error=${role_key === "super_admin" ? "super-only" : "save"}`);
  }
  redirect("/admin/users?saved=roles");
}

export async function setActive(formData: FormData) {
  const staff = await requirePermission("users.edit");
  const userId = String(formData.get("user_id") ?? "");
  const active = formData.get("active") === "true";
  if (!UUID.test(userId)) redirect("/admin/users?error=save");
  if (userId === staff.user.id && !active) redirect("/admin/users?error=self");
  const { error } = await staff.supabase.from("profiles").update({ is_active: active }).eq("id", userId);
  redirect(`/admin/users?${error ? "error=save" : active ? "saved=activated" : "saved=deactivated"}`);
}
