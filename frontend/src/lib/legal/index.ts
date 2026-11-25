import { acceptableUsePolicy } from "./acceptable-use-policy";
import { cookiePolicy } from "./cookie-policy";
import { privacyPolicy } from "./privacy-policy";
import { termsOfUse } from "./terms-of-use";
import type { LegalBlock, LegalDocument } from "./types";

export type { LegalBlock, LegalDocument, LegalSection } from "./types";

/** In footer order. */
export const LEGAL_DOCUMENTS: LegalDocument[] = [privacyPolicy, termsOfUse, acceptableUsePolicy, cookiePolicy];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((d) => d.slug === slug);
}

/** Names of the other policies, linked wherever they are mentioned in the text. */
export const POLICY_LINKS: { phrase: string; href: string }[] = [
  { phrase: "Privacy Policy", href: "/privacy-policy" },
  { phrase: "Website Terms of Use", href: "/terms-of-service" },
  { phrase: "Acceptable Use Policy", href: "/acceptable-use-policy" },
  { phrase: "Cookie Policy", href: "/cookie-policy" },
  { phrase: "Contact page", href: "/contact" },
];

/** All the text of a document, for site search. */
export function legalPlainText(doc: LegalDocument): string {
  const blockText = (b: LegalBlock) => (typeof b === "string" ? b : b.list.join(" "));
  return doc.sections.map((s) => `${s.heading} ${s.blocks.map(blockText).join(" ")}`).join(" ");
}

/** Splits text into plain and linked parts, linking policy names (not on their own page). */
export function linkPolicies(text: string, currentSlug: string): ({ text: string } | { text: string; href: string })[] {
  const links = POLICY_LINKS.filter((l) => l.href !== `/${currentSlug}`);
  const pattern = new RegExp(`(${links.map((l) => l.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => {
      const link = links.find((l) => l.phrase === part);
      return link ? { text: part, href: link.href } : { text: part };
    });
}
