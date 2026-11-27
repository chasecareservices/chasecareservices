import { describe, expect, it } from "vitest";
import { CHUNK_BYTES, checkFile, cleanFileName, formatBytes } from "./files";

describe("document files", () => {
  it("accepts documents and photos, refuses others and oversize files", () => {
    expect(checkFile({ name: "report.pdf", size: 1000, type: "application/pdf" })).toBeNull();
    expect(checkFile({ name: "notes.docx", size: 1000, type: "" })).toBeNull();
    expect(checkFile({ name: "virus.exe", size: 1000, type: "application/x-msdownload" })).toMatch(/Only PDF/);
    expect(checkFile({ name: "big.pdf", size: 26 * 1024 * 1024, type: "application/pdf" })).toMatch(/25 MB/);
    expect(checkFile({ name: "empty.pdf", size: 0, type: "application/pdf" })).toMatch(/empty/);
  });
  it("keeps names safe and sizes readable", () => {
    expect(cleanFileName('a/b\\c:"d".pdf')).toBe("a b c d .pdf");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
  it("sends pieces Google accepts and Vercel allows", () => {
    expect(CHUNK_BYTES % (256 * 1024)).toBe(0);
    expect(CHUNK_BYTES).toBeLessThan(4.5 * 1000 * 1000);
  });
});
