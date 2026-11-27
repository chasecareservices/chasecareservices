import { NextResponse, type NextRequest } from "next/server";
import type { UploadTicket } from "@/app/documents-actions";
import { getSession } from "@/lib/admin/session";
import { decryptSecret, readTicket } from "@/lib/drive/crypto";
import { CHUNK_BYTES } from "@/lib/drive/files";
import { sendPiece } from "@/lib/drive/google";

export const maxDuration = 60;

/** Step 2: one piece of the file (under 4 MB), passed on to Google Drive. */
export async function POST(req: NextRequest) {
  const t = readTicket<UploadTicket>(req.headers.get("x-ticket") ?? "");
  const session = await getSession();
  if (!t || session.kind !== "user" || session.user.id !== t.uid) return NextResponse.json({ error: "The upload expired. Please try again." }, { status: 403 });
  const start = Number(req.headers.get("x-start"));
  const body = await req.arrayBuffer();
  if (!Number.isInteger(start) || start < 0 || start % CHUNK_BYTES !== 0 || !body.byteLength || body.byteLength > CHUNK_BYTES || start + body.byteLength > t.size) {
    return NextResponse.json({ error: "Part of the file was the wrong size. Please try again." }, { status: 400 });
  }
  try {
    return NextResponse.json(await sendPiece(decryptSecret(t.uploadUrlEnc), body, start, t.size));
  } catch {
    return NextResponse.json({ error: "Part of the file didn't reach Google Drive. Please try again." }, { status: 502 });
  }
}
