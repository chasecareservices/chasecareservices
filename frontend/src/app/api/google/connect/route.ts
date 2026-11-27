import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin/session";
import { GOOGLE, driveConfigured } from "@/lib/drive/google";
import { siteOrigin } from "@/lib/drive/site";

/** The owner clicks "Connect Google Drive": send them to Google to sign in with the company account. */
export async function GET() {
  const session = await getSession();
  if (session.kind !== "user" || !session.isStaff) return NextResponse.redirect(new URL("/admin/login", await siteOrigin()));
  const { data: perms } = await session.supabase.rpc("my_permissions");
  if (!((perms as string[] | null) ?? []).includes("settings.edit")) return NextResponse.redirect(new URL("/admin?denied=1", await siteOrigin()));
  if (!driveConfigured()) return NextResponse.redirect(new URL("/admin/settings?drive=not-configured#documents", await siteOrigin()));

  const state = randomBytes(24).toString("base64url");
  const origin = await siteOrigin();
  const url = new URL(`${GOOGLE.accounts}/o/oauth2/v2/auth`);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin}/api/google/callback`,
    response_type: "code",
    scope: GOOGLE.scope,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("chase_drive_state", state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", path: "/api/google", maxAge: 600 });
  return res;
}
