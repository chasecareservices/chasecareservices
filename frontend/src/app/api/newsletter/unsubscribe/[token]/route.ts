import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/app/(site)/newsletter-actions";

/** One-click unsubscribe from mail apps (RFC 8058): POST with List-Unsubscribe=One-Click. */
export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await unsubscribeByToken(token);
  return new NextResponse(null, { status: 200 });
}

/** Someone opened the link in a browser: show the page that asks first. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/newsletter/unsubscribe/${encodeURIComponent(token)}`, req.url), 303);
}
