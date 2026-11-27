/** Which files can be kept, and how they're labelled. No server code: unit tested. */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** Upload pieces sent through the website: a multiple of 256 KB, under Vercel's 4.5 MB limit. */
export const CHUNK_BYTES = 15 * 256 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "image/jpeg": "Photo",
  "image/png": "Photo",
  "image/heic": "Photo",
  "image/webp": "Photo",
  "text/plain": "Text",
};

export const CATEGORIES = {
  client: [
    { value: "assessment", label: "Assessment" },
    { value: "care_plan", label: "Care plan" },
    { value: "consent", label: "Consent form" },
    { value: "medical", label: "Medical letter or record" },
    { value: "report", label: "Report" },
    { value: "identity", label: "ID document" },
    { value: "contract", label: "Contract or agreement" },
    { value: "other", label: "Other" },
  ],
  worker: [
    { value: "identity", label: "ID card or passport" },
    { value: "certificate", label: "Certificate or training" },
    { value: "contract", label: "Contract" },
    { value: "assessment", label: "Police or reference check" },
    { value: "other", label: "Other (e.g. CV)" },
  ],
} as const;

export const categoryLabel = (v: string) =>
  [...CATEGORIES.client, ...CATEGORIES.worker].find((c) => c.value === v)?.label ?? "Other";

/** Checks a file before uploading. Returns a plain-words problem, or null if it's fine. */
export function checkFile(f: { name: string; size: number; type: string }): string | null {
  if (!f.size) return "That file is empty.";
  if (f.size > MAX_FILE_BYTES) return "That file is too big. The limit is 25 MB.";
  if (!ALLOWED_TYPES[f.type] && !/\.(pdf|docx?|xlsx?|jpe?g|png|heic|webp|txt)$/i.test(f.name)) {
    return "Only PDF, Word, Excel, photo or text files can be kept.";
  }
  return null;
}

/** A safe file name for Drive and for downloads. */
export function cleanFileName(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "document").slice(0, 200);
}

export function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
