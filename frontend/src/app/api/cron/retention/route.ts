import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSecretClient } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

/** Called once a week by Vercel Cron (see vercel.json): deletes website data older than the retention rule. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const got = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const db = createSecretClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const { data, error } = await db.rpc("apply_retention");
  if (error) return NextResponse.json({ error: "Clean-up failed" }, { status: 500 });
  return NextResponse.json(data);
}
