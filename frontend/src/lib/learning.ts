/** ChaseCare Academy online learning helpers. No server code: unit tested. */

export const CERT_TYPE_LABEL: Record<string, string> = {
  internal: "ChaseCare internal certificate",
  cpd: "CPD certificate",
  externally_accredited: "Externally accredited",
};

/** What the certificate says about recognition: never claims accreditation unless recorded. */
export function certificationLine(type: string, body: string | null | undefined) {
  if (type === "externally_accredited" && body) return `Accredited by ${body}`;
  if (type === "cpd") return "Continuing Professional Development (CPD)";
  return "ChaseCare Academy internal certificate";
}

/** YouTube and Vimeo links → an embeddable player URL (privacy-friendly YouTube domain). Other links: null. */
export function videoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.pathname === "/watch" ? u.searchParams.get("v") : (u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ?? null);
  }
  if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const v = u.pathname.match(/(\d{5,12})/)?.[1];
    if (v) return `https://player.vimeo.com/video/${v}`;
  }
  return null;
}

export function percent(done: number, total: number) {
  return total ? Math.round((done / total) * 100) : 0;
}

/** Lessons grouped under their section headings, in order. */
export function groupBySection<T extends { section: string | null }>(lessons: T[]) {
  const groups: { section: string | null; lessons: T[] }[] = [];
  for (const l of lessons) {
    const last = groups[groups.length - 1];
    if (last && last.section === l.section) last.lessons.push(l);
    else groups.push({ section: l.section, lessons: [l] });
  }
  return groups;
}

/** The first lesson not yet finished (or null when all are done). */
export function nextLesson<T extends { id: string }>(lessons: T[], done: Set<string>) {
  return lessons.find((l) => !done.has(l.id)) ?? null;
}

export const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? "hour" : "hours"}`;
