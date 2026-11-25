"use client";

import { useState } from "react";
import { createAuthBrowserClient } from "@/lib/supabase/browser-auth";

const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Resolves a stored path (media library) or a built-in "/videos/…" file to a playable URL. */
function videoUrl(path: string) {
  if (!path || path.startsWith("/")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-media/${path}`;
}

/**
 * Uploads a video straight from the browser to the public-media bucket as the signed-in
 * staff member (storage rules check media.create), then hands the stored path to the form
 * through a hidden input. Videos are too large to send through the website's server.
 */
export function VideoUploadField({ name, current, label }: { name: string; current: string; label: string }) {
  const [path, setPath] = useState(current);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    const ext = VIDEO_TYPES[file.type];
    if (!ext) return fail("Videos must be MP4 or WebM files.");
    if (file.size > MAX_VIDEO_BYTES) return fail("Videos must be 50 MB or smaller. Try exporting a shorter or smaller version.");
    setStatus("uploading");
    setMessage("Uploading… this can take a minute for large videos. Keep this page open.");
    const supabase = createAuthBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const stored = `slider/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("public-media").upload(stored, file, { contentType: file.type, upsert: false });
    if (error) return fail(/row-level security|unauthori/i.test(error.message) ? "You don't have permission to upload media." : "The video could not be uploaded. Please try again.");
    await supabase.from("media_assets").insert({
      bucket_id: "public-media",
      object_path: stored,
      folder: "slider",
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: auth.user?.id ?? null,
    });
    setPath(stored);
    setStatus("idle");
    setMessage("Video uploaded. Click “Save slider” to put it on the homepage.");
  }

  function fail(text: string) {
    setStatus("error");
    setMessage(text);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={path} />
      {status === "uploading" && <input type="hidden" name={`${name}__uploading`} value="1" />}
      {path ? (
        <video src={videoUrl(path)} muted loop playsInline autoPlay className="h-28 w-48 rounded-lg bg-black object-cover ring-1 ring-gray-200" />
      ) : null}
      <label className="block text-xs font-semibold text-brand-900">
        {label}
        <input
          type="file"
          accept="video/mp4,video/webm"
          disabled={status === "uploading"}
          onChange={(e) => upload(e.target.files?.[0])}
          className="mt-1 block w-full text-xs font-normal"
        />
      </label>
      {path && (
        <button type="button" onClick={() => { setPath(""); setMessage("Video removed. Click “Save slider” to confirm."); }} className="text-xs font-semibold text-red-700 underline">
          Remove video
        </button>
      )}
      {message && (
        <p role={status === "error" ? "alert" : "status"} className={`text-xs ${status === "error" ? "text-red-700" : "text-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
