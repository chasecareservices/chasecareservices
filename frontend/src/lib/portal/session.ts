import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/lib/admin/session";

/**
 * For care worker portal pages: a signed-in, active user with the Worker role.
 * Staff without the Worker role are sent to their dashboard instead.
 */
export const requireWorker = cache(async () => {
  const session = await getSession();
  if (session.kind === "signed-out") redirect("/portal/login");
  if (!session.isWorker) redirect(session.isStaff ? "/admin" : session.isFamily ? "/family" : session.isLearner ? "/learn" : "/portal/no-access");
  const firstName = session.displayName.replace(/\s*\(.*\)$/, "").split(/\s+/)[0];
  return { ...session, firstName };
});
