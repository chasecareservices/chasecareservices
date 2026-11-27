import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/admin/session";
import { encryptSecret } from "@/lib/drive/crypto";
import { GOOGLE, createFolder } from "@/lib/drive/google";
import { siteOrigin } from "@/lib/drive/site";
import { createSecretClient } from "@/lib/supabase/server-auth";

/** Google sends the owner back here. Saves the connection and creates the folders. */
export async function GET(req: NextRequest) {
  const origin = await siteOrigin();
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL(`/admin/settings?drive=${result}#documents`, origin));
    res.cookies.delete({ name: "chase_drive_state", path: "/api/google" });
    return res;
  };
  const params = req.nextUrl.searchParams;
  const state = req.cookies.get("chase_drive_state")?.value;
  if (params.get("error")) return back("cancelled");
  if (!state || params.get("state") !== state || !params.get("code")) return back("failed");

  const session = await getSession();
  if (session.kind !== "user" || !session.isStaff) return back("failed");
  const { data: perms } = await session.supabase.rpc("my_permissions");
  if (!((perms as string[] | null) ?? []).includes("settings.edit")) return back("failed");

  const tokenRes = await fetch(`${GOOGLE.oauth}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.get("code")!,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${origin}/api/google/callback`,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenRes.ok) return back("failed");
  const tokens = (await tokenRes.json()) as { access_token: string; refresh_token?: string; id_token?: string; scope?: string };
  if (!tokens.refresh_token) return back("no-refresh");
  if (tokens.scope && !tokens.scope.includes("drive.file")) return back("no-permission");

  // The id_token came straight from Google over HTTPS; we only read the email from it.
  let email = "the company Google account";
  try {
    const payload = JSON.parse(Buffer.from((tokens.id_token ?? "").split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
    if (payload.email) email = payload.email;
  } catch {}

  const db = createSecretClient();
  if (!db) return back("failed");
  try {
    const root = await createFolder("Chase Care Documents", null, tokens.access_token);
    const [clients, workers] = await Promise.all([createFolder("Clients", root, tokens.access_token), createFolder("Care workers", root, tokens.access_token)]);
    const { error } = await db.rpc("drive_connection_save", {
      account_email: email,
      refresh_token_enc: encryptSecret(tokens.refresh_token),
      root_folder_id: root,
      clients_folder_id: clients,
      workers_folder_id: workers,
      connected_by: session.user.id,
    });
    if (error) return back("failed");
  } catch (e) {
    console.error("[drive] connect failed:", e instanceof Error ? e.message : e);
    return back("failed");
  }
  return back("connected");
}
