import { PAGE_COPY } from "@/lib/site-copy";

export type SearchKind = "page" | "service" | "course" | "article" | "product";

export type SearchResult = {
  kind: SearchKind;
  title: string;
  summary: string | null;
  url: string;
  rank: number;
};

/** Section headings on the results page, in display order. */
export const KIND_LABELS: Record<SearchKind, string> = {
  page: "Pages",
  service: "Services",
  course: "Courses",
  article: "Journal articles",
  product: "Shop",
};

/** Main pages built into the site (not stored in the database), so search can find them too. */
const STATIC_PAGES: { title: string; url: string; summary: string; keywords: string }[] = [
  { title: "Home", url: "/", summary: "Quality Care. Compassionate Support. Empowered Lives.", keywords: "chase care services ghana" },
  {
    title: "About Us",
    url: "/about",
    summary: "Who we are, our vision and mission, values, board of directors and partners.",
    keywords: "vision mission values board directors leadership team partners compassion dignity safeguarding",
  },
  {
    title: "Care Services",
    url: "/care-services",
    summary: "Professional, person-centred care for every stage of life.",
    keywords: "elderly disability autism home care nanny housekeeping therapy",
  },
  {
    title: "Care From Anywhere in the World",
    url: "/diaspora",
    summary: "Arrange trusted care for your loved ones in Ghana while you live abroad.",
    keywords: "diaspora abroad uk usa overseas family parents welfare visits care coordination",
  },
  {
    title: "Respite & Accommodation",
    url: "/respite",
    summary: "Planned respite for families and short stays for people with additional needs.",
    keywords: "respite short stay break residence accommodation airbnb",
  },
  {
    title: "ChaseCare Academy",
    url: "/academy",
    summary: "Care training, CPD and the Start Your Career in Care programme.",
    keywords: "training courses cpd certificate student programme career dementia first aid safeguarding",
  },
  {
    title: "The ChaseCare Journal",
    url: "/journal",
    summary: "Articles and guidance on care, wellbeing and community.",
    keywords: "blog news articles resources",
  },
  { title: "Shop", url: "/shop", summary: "Care ID cards, lanyards, ChaseCare clothing and training materials.", keywords: "buy uniform t-shirt" },
  { title: "Contact Us", url: "/contact", summary: "Call, WhatsApp, email or send us a message.", keywords: "phone whatsapp email address location hours" },
  {
    title: "Request Care",
    url: "/register/client",
    summary: "Tell us about the care you or your loved one needs.",
    keywords: "i need care client registration book enquiry",
  },
];

/** Lower-case words of 2+ letters/digits, at most 8 — mirrors the database's rules. */
export function searchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
}

/** Every typed word must match the start of some word in the text. */
function matches(tokens: string[], text: string): boolean {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

/** Searches the built-in pages (static pages and the copy in site-copy.ts). */
export function searchBuiltInPages(query: string): SearchResult[] {
  const tokens = searchTokens(query);
  if (!tokens.length) return [];
  const phrase = tokens.join(" ");
  const candidates = [
    ...STATIC_PAGES,
    ...Object.entries(PAGE_COPY).map(([slug, copy]) => ({
      title: copy.title,
      url: `/${slug}`,
      summary: copy.intro,
      keywords: [copy.eyebrow ?? "", ...copy.sections.flatMap((s) => [s.heading, s.text ?? "", ...(s.items ?? []), ...(s.pathway ?? [])])].join(" "),
    })),
  ];
  return candidates
    .filter((p) => matches(tokens, `${p.title} ${p.summary} ${p.keywords}`))
    .map((p) => {
      const inTitle = matches(tokens, p.title);
      const startsTitle = p.title.toLowerCase().startsWith(phrase);
      return {
        kind: "page" as const,
        title: p.title,
        summary: p.summary,
        url: p.url,
        rank: (startsTitle ? 1.5 : inTitle ? 1 : 0) + (matches(tokens, p.summary) ? 0.2 : 0.05),
      };
    });
}

/** Combines database and built-in results, keeping the best-ranked entry per address. */
export function mergeResults(...lists: SearchResult[][]): SearchResult[] {
  const byUrl = new Map<string, SearchResult>();
  for (const r of lists.flat()) {
    const existing = byUrl.get(r.url);
    if (!existing || r.rank > existing.rank) byUrl.set(r.url, r);
  }
  return [...byUrl.values()].sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title));
}

/**
 * Groups results by kind, dropping empty groups. The group holding the best match comes
 * first (ties follow the order of KIND_LABELS), so "elderly" shows Services before Pages.
 */
export function groupResults(results: SearchResult[]): { kind: SearchKind; label: string; items: SearchResult[] }[] {
  const order = Object.keys(KIND_LABELS) as SearchKind[];
  return order
    .map((kind) => ({ kind, label: KIND_LABELS[kind], items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.items[0].rank - a.items[0].rank || order.indexOf(a.kind) - order.indexOf(b.kind));
}
