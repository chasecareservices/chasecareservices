import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/lib/admin/session";

/** For family portal pages: a signed-in, active user with the Client / Family role. */
export const requireFamily = cache(async () => {
  const session = await getSession();
  if (session.kind === "signed-out") redirect("/family/login");
  if (!session.isFamily) redirect(session.isStaff ? "/admin" : session.isWorker ? "/portal" : session.isLearner ? "/learn" : "/family/no-access");
  const firstName = session.displayName.replace(/\s*\(.*\)$/, "").split(/\s+/)[0];
  return { ...session, firstName };
});
