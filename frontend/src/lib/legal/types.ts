/** A paragraph of text, or a bulleted list. */
export type LegalBlock = string | { list: string[] };

export type LegalSection = {
  id: string;
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  /** One-line description for the page banner, search and search engines. */
  summary: string;
  version: string;
  lastUpdated: string;
  sections: LegalSection[];
};
