"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/session";
import { encryptSecret, readTicket, signTicket } from "@/lib/drive/crypto";
import { DriveError, getFile, ownerFolder, startUpload, trashFile } from "@/lib/drive/google";
import { checkFile, cleanFileName } from "@/lib/drive/files";
import { createSecretClient } from "@/lib/supabase/server-auth";

export type UploadTicket = {
  uid: string;
  ownerKind: "client" | "worker";
  ownerId: string;
  reportId: string | null;
  name: string;
  size: number;
  mime: string;
  category: string;
  nonce: string;
  folderId: string;
  uploadUrlEnc: string;
  exp: number;
};

const UUID = /^[0-9a-f-]{36}$/;
const friendly = (e: unknown) =>
  e instanceof DriveError ? e.message : "Something went wrong saving the file. Please try again.";

/** Who may add this file? Returns a reason when they may not. */
async function mayAdd(input: { ownerKind: "client" | "worker"; ownerId: string; category: string; reportId: string | null }) {
  const session = await getSession();
  if (session.kind !== "user") return { error: "Please sign in again." } as const;
  if (session.isStaff) {
    const { data } = await session.supabase.rpc("my_permissions");
    const perms = new Set((data as string[] | null) ?? []);
    const need = input.ownerKind === "client" ? "clients.edit" : "workforce.edit";
    if (!perms.has(need)) return { error: "You don't have permission to add documents here." } as const;
    return { session } as const;
  }
  if (session.isWorker && input.ownerKind === "client" && input.category === "report") {
    const { data: assigned } = await session.supabase.rpc("is_assigned_to", { client: input.ownerId });
    if (!assigned) return { error: "You can only send files for the people you look after." } as const;
    if (input.reportId) {
      const { data: r } = await session.supabase.from("care_reports").select("id").eq("id", input.reportId).eq("worker_id", session.user.id).maybeSingle();
      if (!r) return { error: "That report isn't yours." } as const;
    }
    return { session } as const;
  }
  // Care workers may send their own ID, certificates and checks (e.g. a renewed police check).
  if (session.isWorker && input.ownerKind === "worker" && input.ownerId === session.user.id && ["identity", "certificate", "assessment"].includes(input.category)) {
    return { session } as const;
  }
  return { error: "You don't have permission to add documents here." } as const;
}

/** Step 1: check the file and permission, and open an upload in the right Drive folder. */
export async function startDocumentUpload(input: {
  ownerKind: "client" | "worker";
  ownerId: string;
  reportId?: string | null;
  name: string;
  size: number;
  mime: string;
  category: string;
}): Promise<{ ticket: string } | { error: string }> {
  if (!UUID.test(input.ownerId) || (input.reportId && !UUID.test(input.reportId))) return { error: "Something went wrong. Please reload the page." };
  const problem = checkFile({ name: input.name, size: input.size, type: input.mime });
  if (problem) return { error: problem };
  const reportId = input.reportId ?? null;
  const allowed = await mayAdd({ ownerKind: input.ownerKind, ownerId: input.ownerId, category: input.category, reportId });
  if ("error" in allowed) return { error: allowed.error! };

  const admin = createSecretClient();
  if (!admin) return { error: "Documents aren't set up yet. Ask your developer." };
  const { data: owner } =
    input.ownerKind === "client"
      ? await admin.from("care_clients").select("full_name").eq("id", input.ownerId).maybeSingle()
      : await admin.from("profiles").select("full_name").eq("id", input.ownerId).maybeSingle();
  if (!owner) return { error: "That person wasn't found." };

  try {
    const name = cleanFileName(input.name);
    const mime = input.mime || "application/octet-stream";
    const folderId = await ownerFolder(input.ownerKind, input.ownerId, owner.full_name ?? "Unnamed");
    const nonce = randomBytes(16).toString("hex");
    const uploadUrl = await startUpload({ folderId, name, mime, size: input.size, nonce });
    const ticket: UploadTicket = {
      uid: allowed.session.user.id,
      ownerKind: input.ownerKind,
      ownerId: input.ownerId,
      reportId,
      name,
      size: input.size,
      mime,
      category: input.category,
      nonce,
      folderId,
      uploadUrlEnc: encryptSecret(uploadUrl),
      exp: Date.now() + 2 * 3600_000,
    };
    return { ticket: signTicket(ticket) };
  } catch (e) {
    return { error: friendly(e) };
  }
}

/** Step 3: check the file landed in the right folder, then list it. */
export async function finishDocumentUpload(ticketText: string, fileId: string): Promise<{ ok: true } | { error: string }> {
  const t = readTicket<UploadTicket>(ticketText);
  const session = await getSession();
  if (!t || session.kind !== "user" || session.user.id !== t.uid) return { error: "The upload expired. Please try again." };
  try {
    const f = await getFile(fileId);
    if (!f.parents?.includes(t.folderId) || f.appProperties?.chase !== t.nonce || Number(f.size ?? t.size) !== t.size) {
      return { error: "The uploaded file didn't match. Please try again." };
    }
    const { error } = await session.supabase.from("care_documents").insert({
      client_id: t.ownerKind === "client" ? t.ownerId : null,
      worker_id: t.ownerKind === "worker" ? t.ownerId : null,
      report_id: t.reportId,
      drive_file_id: f.id,
      name: t.name,
      mime_type: t.mime,
      size_bytes: t.size,
      category: t.category,
      uploaded_by: t.uid,
    });
    if (error) {
      await trashFile(f.id).catch(() => undefined);
      return { error: "The file couldn't be saved to the record. Please try again." };
    }
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/portal", "layout");
  return { ok: true };
}

/** Removes a document from the record and moves it to the Drive bin (kept 30 days). */
export async function deleteDocument(formData: FormData): Promise<{ error: string } | undefined> {
  const id = String(formData.get("id") ?? "");
  const session = await getSession();
  if (session.kind !== "user" || !session.isStaff || !UUID.test(id)) return { error: "You don't have permission to remove documents." };
  const { data: deleted, error } = await session.supabase.from("care_documents").delete().eq("id", id).select("drive_file_id").maybeSingle();
  if (error || !deleted) return { error: "You don't have permission to remove this document." };
  await trashFile(deleted.drive_file_id).catch((e) => console.error("[drive] trash failed:", e instanceof Error ? e.message : e));
  revalidatePath("/admin", "layout");
  return undefined;
}
