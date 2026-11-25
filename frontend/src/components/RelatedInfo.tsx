import Link from "next/link";
import { getMainMenu } from "@/lib/content";
import { relatedLinksFor } from "@/lib/related";

function ArrowCircle() {
  return (
    <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-500 text-brand-950 transition group-hover:bg-brand-800 group-hover:text-white">
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h11M11 6l4 4-4 4" />
      </svg>
    </span>
  );
}

/** "Related information" box: other pages in this page's menu section, plus Request Care and Contact Us. */
export async function RelatedInfo({ pathname, className = "" }: { pathname: string; className?: string }) {
  const { links } = relatedLinksFor(await getMainMenu(), pathname);
  if (!links.length) return null;
  return (
    <nav aria-labelledby="related-heading" className={`bg-white shadow-[0_8px_30px_-12px_rgba(42,6,68,0.25)] ring-1 ring-brand-100 ${className}`}>
      <h2 id="related-heading" className="border-b-4 border-accent-500 px-6 pb-4 pt-6 text-2xl font-bold text-brand-900">
        Related information
      </h2>
      <ul className="px-4 py-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 text-[0.9375rem] text-ink hover:bg-brand-50">
              <ArrowCircle />
              <span className="group-hover:text-brand-800">{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
