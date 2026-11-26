import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createAuthClient } from "@/lib/supabase/server-auth";

export type StaffSession = Awaited<ReturnType<typeof loadSession>> & { kind: "staff" };

const loadSession = async () => {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "signed-out" as const };

  const [{ data: aal }, { data: isStaff }, { data: isWorker }, { data: isFamily }, { data: mfaRequired }, { data: profile }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.rpc("has_staff_role"),
    supabase.rpc("is_care_worker"),
    supabase.rpc("is_family_member"),
    supabase.rpc("staff_mfa_required"),
    supabase.from("profiles").select("full_name, is_active").eq("id", user.id).maybeSingle(),
  ]);

  return {
    kind: "user" as const,
    supabase,
    user,
    isStaff: isStaff === true,
    isWorker: isWorker === true,
    isFamily: isFamily === true,
    mfaRequired: mfaRequired !== false,
    currentLevel: aal?.currentLevel ?? "aal1",
    nextLevel: aal?.nextLevel ?? "aal1",
    displayName: profile?.full_name || user.email || "Staff member",
  };
};

/** Current sign-in state, once per request. */
export const getSession = cache(loadSession);

/**
 * For dashboard pages: signed-in, active staff who have passed two-step verification
 * (when required). Returns the session plus their permissions; redirects otherwise.
 */
export const requireStaff = cache(async () => {
  const session = await getSession();
  if (session.kind === "signed-out") redirect("/admin/login");
  if (!session.isStaff) redirect(session.isWorker ? "/portal" : session.isFamily ? "/family" : "/admin/no-access");
  if (session.mfaRequired && session.currentLevel !== "aal2") redirect("/admin/two-step");

  const { data } = await session.supabase.rpc("my_permissions");
  const permissions = new Set<string>((data as string[] | null) ?? []);
  return {
    ...session,
    permissions,
    can: (permission: string) => permissions.has(permission),
  };
});

/** For a page or action that needs a specific permission. */
export async function requirePermission(permission: string) {
  const staff = await requireStaff();
  if (!staff.can(permission)) redirect("/admin?denied=1");
  return staff;
}
