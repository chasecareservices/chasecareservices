import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/lib/admin/session";

/** For the learner area: care workers, learners and healthcare professionals. */
export const requireLearner = cache(async () => {
  const session = await getSession();
  if (session.kind === "signed-out") redirect("/learn/login");
  if (!session.isLearner) redirect(session.isStaff ? "/admin" : session.isFamily ? "/family" : "/learn/no-access");
  const firstName = session.displayName.replace(/\s*\(.*\)$/, "").split(/\s+/)[0];
  return { ...session, firstName };
});
