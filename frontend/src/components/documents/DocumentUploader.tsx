"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { finishDocumentUpload, startDocumentUpload } from "@/app/documents-actions";
import { CHUNK_BYTES, checkFile, formatBytes } from "@/lib/drive/files";

type Props = {
  ownerKind: "client" | "worker";
  ownerId: string;
  reportId?: string;
  /** Categories to choose from; with one, it is used without asking. */
  categories: readonly { value: string; label: string }[];
  /** Larger text and buttons for the care worker portal. */
  large?: boolean;
  label?: string;
};

/** Picks a file and sends it to the company Google Drive in pieces, with progress. */
export function DocumentUploader({ ownerKind, ownerId, reportId, categories, large = false, label = "Add a document" }: Props) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(categories.length === 1 ? categories[0].value : "");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function upload() {
    if (!file) return setError("Choose a file first.");
    if (!category) return setError("Choose what kind of document it is.");
    const problem = checkFile(file);
    if (problem) return setError(problem);
    setError(null);
    setDone(null);
    setProgress(0);
    try {
      const started = await startDocumentUpload({ ownerKind, ownerId, reportId: reportId ?? null, name: file.name, size: file.size, mime: file.type, category });
      if ("error" in started) throw new Error(started.error);
      let fileId: string | null = null;
      for (let start = 0; start < file.size; start += CHUNK_BYTES) {
        const piece = file.slice(start, Math.min(start + CHUNK_BYTES, file.size));
        const res = await fetch("/api/documents/upload", { method: "POST", headers: { "x-ticket": started.ticket, "x-start": String(start) }, body: piece });
        const json = (await res.json().catch(() => ({ error: "The upload failed. Please try again." }))) as { done?: boolean; id?: string; error?: string };
        if (!res.ok || json.error) throw new Error(json.error ?? "The upload failed. Please try again.");
        setProgress(Math.round(((start + piece.size) / file.size) * 100));
        if (json.done) fileId = json.id ?? null;
      }
      if (!fileId) throw new Error("The upload didn't finish. Please try again.");
      const finished = await finishDocumentUpload(started.ticket, fileId);
      if ("error" in finished) throw new Error(finished.error);
      setDone(file.name);
      setFile(null);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed. Please try again.");
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  const btn = large ? "min-h-12 px-6 text-base" : "min-h-11 px-5 text-sm";
  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${categories.length > 1 ? "sm:grid-cols-2" : ""}`}>
        <label htmlFor={`${id}-file`} className={`block font-medium text-brand-900 ${large ? "text-base" : "text-sm"}`}>
          {label}
          <input
            ref={input}
            id={`${id}-file`}
            type="file"
            disabled={busy}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.webp,.txt,application/pdf,image/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              setDone(null);
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-4 file:py-2 file:font-semibold file:text-brand-800"
          />
          <span className="mt-1 block text-xs font-normal text-muted">PDF, Word, Excel or a photo, up to 25 MB.</span>
        </label>
        {categories.length > 1 && (
          <label htmlFor={`${id}-cat`} className="block text-sm font-medium text-brand-900">
            What is it?
            <select id={`${id}-cat`} value={category} disabled={busy} onChange={(e) => setCategory(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm">
              <option value="" disabled>
                Choose…
              </option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {file && !busy && <p className="text-sm text-muted">{`${file.name} · ${formatBytes(file.size)}`}</p>}
      {busy && (
        <div role="progressbar" aria-label="Uploading" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100} className="h-3 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full bg-brand-700 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {busy ? `Uploading… ${progress}%` : done ? <span className="font-semibold text-green-800">✓ {done} sent to the company Google Drive.</span> : null}
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
      <button type="button" onClick={upload} disabled={busy || !file} className={`${btn} rounded-full bg-brand-800 font-semibold text-white hover:bg-brand-700 disabled:opacity-50`}>
        {busy ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
