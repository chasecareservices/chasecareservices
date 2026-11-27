import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin/session";
import { downloadFile } from "@/lib/drive/google";

/** Opens a document. Office staff only, and only documents their role may see. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (session.kind !== "user" || !session.isStaff || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  if (session.mfaRequired && session.currentLevel !== "aal2") return new NextResponse("Two-step verification needed", { status: 403 });
  const { data: doc } = await session.supabase.from("care_documents").select("drive_file_id, name, mime_type").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await downloadFile(doc.drive_file_id);
    const inline = /^(application\/pdf|image\/(jpeg|png|webp)|text\/plain)$/.test(doc.mime_type);
    const ascii = doc.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
    console.info(`[documents] ${session.user.id} opened ${id}`);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": doc.mime_type,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch {
    return new NextResponse("This file couldn't be opened from Google Drive. Please try again.", { status: 502 });
  }
}
