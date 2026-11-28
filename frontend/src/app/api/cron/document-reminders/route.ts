import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runCredentialReminders } from "@/lib/credentials-reminders";

export const dynamic = "force-dynamic";

/** Called once a day by Vercel Cron (see vercel.json), with the CRON_SECRET as a bearer token. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const result = await runCredentialReminders(site);
  return NextResponse.json(result);
}
