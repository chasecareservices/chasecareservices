import "server-only";
import { createSecretClient } from "@/lib/supabase/server-auth";
import { decryptSecret } from "@/lib/drive/crypto";

/**
 * The company Google Drive. Uses only the "drive.file" permission: the website can
 * see and change only the files and folders it created itself.
 * The *_BASE variables exist only so tests can stand in for Google.
 */
export const GOOGLE = {
  accounts: process.env.GOOGLE_ACCOUNTS_BASE ?? "https://accounts.google.com",
  oauth: process.env.GOOGLE_OAUTH_BASE ?? "https://oauth2.googleapis.com",
  api: process.env.GOOGLE_API_BASE ?? "https://www.googleapis.com",
  scope: "https://www.googleapis.com/auth/drive.file openid email",
};

export const driveConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export class DriveError extends Error {
  constructor(
    message: string,
    public reason: "not-connected" | "auth" | "google" = "google",
  ) {
    super(message);
  }
}

type Connection = { account_email: string; refresh_token_enc: string; root_folder_id: string; clients_folder_id: string; workers_folder_id: string };

export async function getConnection(): Promise<Connection | null> {
  const db = createSecretClient();
  if (!db) return null;
  const { data } = await db.rpc("drive_connection_get");
  return (data?.[0] as Connection | undefined) ?? null;
}

let cached: { token: string; until: number; for: string } | null = null;

/** A short-lived Google access token for the company account. */
export async function accessToken(conn?: Connection | null): Promise<string> {
  const c = conn ?? (await getConnection());
  if (!c) throw new DriveError("Google Drive isn't connected yet.", "not-connected");
  if (cached && cached.for === c.refresh_token_enc && Date.now() < cached.until) return cached.token;
  const res = await fetch(`${GOOGLE.oauth}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: decryptSecret(c.refresh_token_enc),
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new DriveError("Google refused the Drive connection. Reconnect Google Drive in Site settings.", "auth");
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, until: Date.now() + (json.expires_in - 60) * 1000, for: c.refresh_token_enc };
  return json.access_token;
}

async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const token = init.token ?? (await accessToken());
  const res = await fetch(`${GOOGLE.api}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body && !(init.headers as Record<string, string>)?.["Content-Type"] ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    console.error(`[drive] ${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
    throw new DriveError("Google Drive didn't accept that. Please try again.");
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export async function createFolder(name: string, parent: string | null, token?: string): Promise<string> {
  const body = { name, mimeType: "application/vnd.google-apps.folder", ...(parent ? { parents: [parent] } : {}) };
  const f = await api<{ id: string }>("/drive/v3/files?fields=id", { method: "POST", body: JSON.stringify(body), token });
  return f.id;
}

/** The Drive folder for one client or care worker, made the first time it's needed. */
export async function ownerFolder(kind: "client" | "worker", ownerId: string, displayName: string): Promise<string> {
  const db = createSecretClient();
  const conn = await getConnection();
  if (!db || !conn) throw new DriveError("Google Drive isn't connected yet.", "not-connected");
  const { data: existing } = await db.rpc("drive_folder_get", { owner_kind: kind, owner_id: ownerId });
  if (existing) return existing as string;
  const parent = kind === "client" ? conn.clients_folder_id : conn.workers_folder_id;
  const folderName = `${displayName.replace(/[\\/]/g, " ").slice(0, 100)} (${ownerId.slice(0, 8)})`;
  const id = await createFolder(folderName, parent);
  await db.rpc("drive_folder_save", { owner_kind: kind, owner_id: ownerId, folder_id: id });
  return id;
}

/** Starts an upload; returns Google's upload address (kept on the server). */
export async function startUpload(p: { folderId: string; name: string; mime: string; size: number; nonce: string }): Promise<string> {
  const token = await accessToken();
  const res = await fetch(`${GOOGLE.api}/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,parents,appProperties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": p.mime,
      "X-Upload-Content-Length": String(p.size),
    },
    body: JSON.stringify({ name: p.name, parents: [p.folderId], appProperties: { chase: p.nonce } }),
    signal: AbortSignal.timeout(15000),
  });
  const location = res.headers.get("location");
  if (!res.ok || !location) throw new DriveError("Google Drive couldn't start the upload. Please try again.");
  return location;
}

/** Sends one piece of the file. Returns the file id when Google has the whole file. */
export async function sendPiece(uploadUrl: string, body: ArrayBuffer, start: number, total: number): Promise<{ done: false } | { done: true; id: string }> {
  const end = start + body.byteLength - 1;
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Length": String(body.byteLength), "Content-Range": `bytes ${start}-${end}/${total}` },
    body,
    signal: AbortSignal.timeout(60000),
  });
  if (res.status === 308) return { done: false };
  if (res.ok) return { done: true, id: ((await res.json()) as { id: string }).id };
  console.error(`[drive] upload piece → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  throw new DriveError("Part of the file didn't reach Google Drive. Please try again.");
}

export type DriveFile = { id: string; name: string; mimeType: string; size?: string; parents?: string[]; appProperties?: Record<string, string>; trashed?: boolean };

export const getFile = (id: string) => api<DriveFile>(`/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,parents,appProperties,trashed`);

/** Moves a file to the Drive bin (Google keeps it there for 30 days). */
export const trashFile = (id: string) => api(`/drive/v3/files/${encodeURIComponent(id)}?fields=id`, { method: "PATCH", body: JSON.stringify({ trashed: true }) });

export async function downloadFile(id: string): Promise<Response> {
  const token = await accessToken();
  const res = await fetch(`${GOOGLE.api}/drive/v3/files/${encodeURIComponent(id)}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new DriveError("That file couldn't be opened from Google Drive.");
  return res;
}
