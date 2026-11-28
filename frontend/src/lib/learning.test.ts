import { describe, expect, it } from "vitest";
import { certificationLine, groupBySection, nextLesson, percent, videoEmbedUrl } from "./learning";

describe("videoEmbedUrl", () => {
  it("turns YouTube and Vimeo links into players", () => {
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
    expect(videoEmbedUrl("https://vimeo.com/123456789")).toBe("https://player.vimeo.com/video/123456789");
  });
  it("ignores anything else", () => {
    expect(videoEmbedUrl("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(videoEmbedUrl("https://evil.example/watch?v=x")).toBeNull();
    expect(videoEmbedUrl("not a url")).toBeNull();
  });
});

describe("certificationLine", () => {
  it("only claims accreditation when there is an accrediting body", () => {
    expect(certificationLine("externally_accredited", "City & Guilds")).toBe("Accredited by City & Guilds");
    expect(certificationLine("externally_accredited", null)).toBe("ChaseCare Academy internal certificate");
    expect(certificationLine("cpd", null)).toMatch(/CPD/);
  });
});

describe("progress", () => {
  it("groups, counts and finds the next lesson", () => {
    const lessons = [
      { id: "a", section: "M1" },
      { id: "b", section: "M1" },
      { id: "c", section: "M2" },
    ];
    expect(groupBySection(lessons).map((g) => [g.section, g.lessons.length])).toEqual([["M1", 2], ["M2", 1]]);
    expect(nextLesson(lessons, new Set(["a"]))?.id).toBe("b");
    expect(nextLesson(lessons, new Set(["a", "b", "c"]))).toBeNull();
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});
