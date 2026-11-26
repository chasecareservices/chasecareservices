import { inviteStaff, setActive, updateRoles } from "./actions";
import { Card, Notice, PageHeader, adminButton, adminButtonSecondary, adminInput, formatDateTime } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { createSecretClient } from "@/lib/supabase/server-auth";

export const metadata = { title: "Staff & roles" };

const MESSAGES: Record<string, string> = {
  invited: "Invitation sent. They'll get an email with a link to choose a password, then set up two-step verification.",
  roles: "Roles updated.",
  activated: "Account reactivated.",
  deactivated: "Account deactivated. They can no longer use the dashboard.",
};
const ERRORS: Record<string, string> = {
  "invite-fields": "Please enter a name, a valid email address and a role.",
  "invite-role": "Please choose a valid staff role.",
  "invite-exists": "That email already has an account. Find them in the list below and change their roles instead.",
  "invite-failed": "The invitation could not be sent. Please check the email address and try again.",
  "invite-role-grant": "The invitation was sent, but the role could not be given. Set it in the list below.",
  "no-secret": "Invitations need the server's secret key (SUPABASE_SECRET_KEY), which isn't set up yet.",
  "super-only": "Only a Super Admin can give or remove the Super Admin role.",
  "last-super": "You can't remove the last active Super Admin.",
  self: "You can't deactivate your own account.",
  save: "That change could not be saved. Please try again.",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; who?: string }> }) {
  const { saved, error, who } = await searchParams;
  const staff = await requirePermission("users.view");
  const canEdit = staff.can("users.edit");

  const [{ data: roles }, { data: userRoles }, { data: profiles }, { data: isSuper }] = await Promise.all([
    staff.supabase.from("roles").select("key, name, description, is_staff").order("is_staff", { ascending: false }).order("name"),
    staff.supabase.from("user_roles").select("user_id, role_key"),
    staff.supabase.from("profiles").select("id, full_name, is_active, created_at"),
    staff.supabase.rpc("current_user_has_role", { role: "super_admin" }),
  ]);
  const staffRoles = (roles ?? []).filter((r) => r.is_staff);
  const staffRoleKeys = new Set(staffRoles.map((r) => r.key));
  const staffIds = [...new Set((userRoles ?? []).filter((r) => staffRoleKeys.has(r.role_key)).map((r) => r.user_id))];

  // Email addresses and sign-in details live in the auth system, readable only with the secret key.
  const admin = createSecretClient();
  const authUsers = new Map<string, { email?: string; last_sign_in_at?: string | null; twoStep: boolean; invited: boolean }>();
  if (admin) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) {
      authUsers.set(u.id, {
        email: u.email,
        last_sign_in_at: u.last_sign_in_at,
        twoStep: (u.factors ?? []).some((f) => f.status === "verified"),
        invited: !u.last_sign_in_at,
      });
    }
  }

  const people = staffIds
    .map((id) => ({
      id,
      profile: profiles?.find((p) => p.id === id),
      auth: authUsers.get(id),
      roles: new Set((userRoles ?? []).filter((r) => r.user_id === id).map((r) => r.role_key)),
    }))
    .sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? ""));

  return (
    <>
      {saved && <Notice>{saved === "invited" && who ? MESSAGES.invited.replace("Invitation sent", `Invitation sent to ${who}`) : MESSAGES[saved]}</Notice>}
      {error && <Notice tone="error">{ERRORS[error] ?? ERRORS.save}</Notice>}
      <PageHeader title="Staff & roles" intro="Who can use this dashboard, and what each person can do." />

      {canEdit && (
        <Card title="Invite a staff member" className="mb-8">
          <form action={inviteStaff} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <label className="text-sm font-medium text-brand-900">
              Full name
              <input name="full_name" required maxLength={200} className={adminInput} />
            </label>
            <label className="text-sm font-medium text-brand-900">
              Email
              <input name="email" type="email" required className={adminInput} />
            </label>
            <label className="text-sm font-medium text-brand-900">
              Role
              <select name="role" required defaultValue="" className={adminInput}>
                <option value="" disabled>
                  Choose…
                </option>
                {staffRoles
                  .filter((r) => r.key !== "super_admin" || isSuper)
                  .map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className={adminButton}>
              Send invitation
            </button>
          </form>
          {!admin && <p className="mt-3 text-sm text-red-700">{ERRORS["no-secret"]}</p>}
        </Card>
      )}

      <div className="space-y-4">
        {people.map((p) => {
          const self = p.id === staff.user.id;
          const active = p.profile?.is_active !== false;
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-brand-900">
                    {p.profile?.full_name || "(no name)"} {self && <span className="text-sm font-normal text-muted">(you)</span>}
                  </h2>
                  <p className="text-sm text-muted">{p.auth?.email ?? "Email hidden"}</p>
                  <p className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                      {active ? "Active" : "Deactivated"}
                    </span>
                    {p.auth && (
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${p.auth.twoStep ? "bg-brand-100 text-brand-800" : "bg-accent-100 text-accent-700"}`}>
                        {p.auth.twoStep ? "Two-step on" : "Two-step not set up"}
                      </span>
                    )}
                    {p.auth && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {p.auth.invited ? "Invitation not yet accepted" : `Last sign-in ${formatDateTime(p.auth.last_sign_in_at)}`}
                      </span>
                    )}
                  </p>
                </div>
                {canEdit && !self && (
                  <form action={setActive}>
                    <input type="hidden" name="user_id" value={p.id} />
                    <input type="hidden" name="active" value={active ? "false" : "true"} />
                    <button type="submit" className={adminButtonSecondary}>
                      {active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                )}
              </div>

              <form action={updateRoles} className="mt-4">
                <input type="hidden" name="user_id" value={p.id} />
                <fieldset disabled={!canEdit}>
                  <legend className="mb-2 text-sm font-semibold text-brand-900">Roles</legend>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {staffRoles.map((r) => (
                      <label key={r.key} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                        <input
                          type="checkbox"
                          name="roles"
                          value={r.key}
                          defaultChecked={p.roles.has(r.key)}
                          disabled={r.key === "super_admin" && !isSuper}
                          className="mt-0.5 h-4 w-4 accent-brand-800"
                        />
                        <span>
                          <span className="font-medium text-brand-900">{r.name}</span>
                          {r.description && <span className="block text-xs text-muted">{r.description}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                  {canEdit && (
                    <button type="submit" className={`${adminButtonSecondary} mt-3`}>
                      Save roles
                    </button>
                  )}
                </fieldset>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
