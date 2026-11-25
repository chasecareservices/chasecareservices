/**
 * Plain-text editing for page and article bodies, so staff never touch JSON:
 *
 *   ## A heading
 *
 *   A paragraph. Blank lines separate paragraphs.
 *
 *   - A bullet point
 *   - Another bullet point
 *
 * Converts to and from the content blocks the website renders (see components/PageBlocks).
 * Blocks this format cannot express (e.g. image or button blocks) are kept as they are.
 */
export type Block = { type: string; visible?: boolean; data?: Record<string, unknown> };

const EDITABLE = new Set(["heading", "paragraph", "text", "list"]);

export function blocksToText(value: unknown): { text: string; preserved: Block[] } {
  const blocks = Array.isArray(value) ? (value as Block[]).filter((b) => b && typeof b.type === "string") : [];
  const parts: string[] = [];
  const preserved: Block[] = [];
  for (const b of blocks) {
    const d = b.data ?? {};
    if (!EDITABLE.has(b.type)) {
      preserved.push(b);
      continue;
    }
    if (b.type === "heading" && typeof d.text === "string") parts.push(`## ${d.text}`);
    if ((b.type === "paragraph" || b.type === "text") && typeof d.text === "string") {
      if (typeof d.heading === "string" && d.heading) parts.push(`## ${d.heading}`);
      parts.push(d.text);
    }
    if (b.type === "list") {
      if (typeof d.heading === "string" && d.heading) parts.push(`## ${d.heading}`);
      const items = Array.isArray(d.items) ? d.items.filter((i): i is string => typeof i === "string") : [];
      if (items.length) parts.push(items.map((i) => `- ${i}`).join("\n"));
    }
  }
  return { text: parts.join("\n\n"), preserved };
}

export function textToBlocks(text: string, preserved: Block[] = []): Block[] {
  const blocks: Block[] = [];
  const chunks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  for (const raw of chunks) {
    const lines = raw.split("\n").map((l) => l.trimEnd());
    let paragraph: string[] = [];
    let list: string[] = [];
    const flush = () => {
      if (paragraph.length) blocks.push({ type: "paragraph", data: { text: paragraph.join("\n").trim() } });
      if (list.length) blocks.push({ type: "list", data: { items: list } });
      paragraph = [];
      list = [];
    };
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith("## ")) {
        flush();
        blocks.push({ type: "heading", data: { text: t.slice(3).trim() } });
      } else if (/^[-*•] /.test(t)) {
        if (paragraph.length) {
          blocks.push({ type: "paragraph", data: { text: paragraph.join("\n").trim() } });
          paragraph = [];
        }
        list.push(t.slice(2).trim());
      } else {
        if (list.length) {
          blocks.push({ type: "list", data: { items: list } });
          list = [];
        }
        paragraph.push(t);
      }
    }
    flush();
  }
  return [...blocks, ...preserved];
}
