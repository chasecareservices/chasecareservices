import { describe, expect, it } from "vitest";
import { blocksToText, textToBlocks } from "./richtext";

describe("textToBlocks", () => {
  it("turns headings, paragraphs and bullet lists into blocks", () => {
    const text = "## Our approach\n\nWe care about the person.\nNot just the task.\n\n- Dignity\n- Respect\n\nClosing line.";
    expect(textToBlocks(text)).toEqual([
      { type: "heading", data: { text: "Our approach" } },
      { type: "paragraph", data: { text: "We care about the person.\nNot just the task." } },
      { type: "list", data: { items: ["Dignity", "Respect"] } },
      { type: "paragraph", data: { text: "Closing line." } },
    ]);
  });

  it("handles a list straight after a paragraph and Windows line endings", () => {
    expect(textToBlocks("Includes:\r\n- One\r\n* Two")).toEqual([
      { type: "paragraph", data: { text: "Includes:" } },
      { type: "list", data: { items: ["One", "Two"] } },
    ]);
  });

  it("returns no blocks for empty text", () => {
    expect(textToBlocks("  \n\n ")).toEqual([]);
  });
});

describe("blocksToText", () => {
  it("round-trips editable blocks and keeps the others aside", () => {
    const blocks = [
      { type: "heading", data: { text: "Title" } },
      { type: "paragraph", data: { text: "Hello" } },
      { type: "image", data: { path: "a.jpg" } },
      { type: "list", data: { items: ["A", "B"] } },
    ];
    const { text, preserved } = blocksToText(blocks);
    expect(text).toBe("## Title\n\nHello\n\n- A\n- B");
    expect(preserved).toEqual([{ type: "image", data: { path: "a.jpg" } }]);
    expect(textToBlocks(text, preserved)).toEqual([blocks[0], blocks[1], blocks[3], blocks[2]]);
  });

  it("copes with missing or odd values", () => {
    expect(blocksToText(null)).toEqual({ text: "", preserved: [] });
    expect(blocksToText([{ type: "list", data: { heading: "Topics", items: ["X", 3] } }]).text).toBe("## Topics\n\n- X");
  });
});
