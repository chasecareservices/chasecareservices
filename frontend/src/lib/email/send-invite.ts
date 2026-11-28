import "server-only";
import { getEmailCopy } from "@/lib/email/copy";
import type { createSecretClient } from "@/lib/supabase/server-auth";
import { inviteEmail, type InviteKind } from "@/lib/email/invite";
import { emailTransport, sendEmail } from "@/lib/email/send";

type Admin = NonNullable<ReturnType<typeof createSecretClient>>;
export type InviteResult = { userId: string } | { error: "exists" | "failed" | "email-failed" };

/**
 * Creates the account and emails a Chase Care invitation from the office mailbox.
 * Without email set up on the website, Supabase's own (plain) invitation is used.
 */
export async function sendInvitation(
  admin: Admin,
  p: { email: string; fullName: string; kind: InviteKind; redirectTo: string; clientName?: string | null },
): Promise<InviteResult> {
  if (!emailTransport()) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(p.email, { data: { full_name: p.fullName }, redirectTo: p.redirectTo });
    if (data?.user) return { userId: data.user.id };
    return { error: /already|registered|exists/i.test(error?.message ?? "") ? "exists" : "failed" };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: p.email,
    options: { data: { full_name: p.fullName }, redirectTo: p.redirectTo },
  });
  if (!data?.user || !data.properties?.action_link) {
    return { error: /already|registered|exists/i.test(error?.message ?? "") ? "exists" : "failed" };
  }
  const { data: settings } = await admin.from("site_settings").select("phone").maybeSingle();
  const sent = await sendEmail({
    to: [p.email],
    ...inviteEmail({ kind: p.kind, name: p.fullName, link: data.properties.action_link, clientName: p.clientName, officePhone: settings?.phone, copy: await getEmailCopy(`invite_${p.kind}`) }),
  });
  if (!sent.sent) {
    // Don't leave an account nobody can get into: remove it so the office can try again.
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "email-failed" };
  }
  return { userId: data.user.id };
}
