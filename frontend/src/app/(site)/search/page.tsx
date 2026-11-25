import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";
import { searchContent } from "@/lib/content";
import { groupResults, mergeResults, searchBuiltInPages } from "@/lib/search";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

const SUGGESTIONS = ["Elderly care", "Autism", "Respite", "Training", "Diaspora", "Join our team"];

export default async function SearchPage({ searchParams }: Props) {
  const query = ((await searchParams).q ?? "").trim().slice(0, 100);
  const results = query ? mergeResults(await searchContent(query), searchBuiltInPages(query)) : [];
  const groups = groupResults(results);

  return (
    <>
      <section className="bg-brand-800 text-white">
        <Container className="py-12 sm:py-16">
          <h1 className="text-3xl font-bold sm:text-4xl">Search</h1>
          <form action="/search" method="get" role="search" className="mt-6 flex max-w-2xl gap-2">
            <label htmlFor="search-page-q" className="sr-only">
              Search the website
            </label>
            <input
              id="search-page-q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search services, courses, articles…"
              autoComplete="off"
              maxLength={100}
              className="min-h-12 min-w-0 flex-1 rounded-full border-0 bg-white px-5 text-base text-ink shadow-sm focus:outline-none focus:ring-4 focus:ring-accent-400"
            />
            <button type="submit" className="min-h-12 flex-none rounded-full bg-accent-500 px-5 sm:px-6 font-semibold text-brand-950 hover:bg-accent-400">
              Search
            </button>
          </form>
          {query && (
            <p className="mt-4 text-brand-100" role="status">
              {results.length === 0
                ? `No results for “${query}”.`
                : `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”.`}
            </p>
          )}
        </Container>
      </section>

      <Container className="py-12">
        {groups.length > 0 ? (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.kind} aria-labelledby={`results-${group.kind}`}>
                <h2 id={`results-${group.kind}`} className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent-700">
                  {group.label}
                </h2>
                <ul className="divide-y divide-brand-100 rounded-2xl border border-brand-100 bg-white">
                  {group.items.map((r) => (
                    <li key={r.url}>
                      <Link href={r.url} className="block px-5 py-4 hover:bg-brand-50">
                        <span className="text-lg font-semibold text-brand-800">{r.title}</span>
                        {r.summary && <span className="mt-1 block text-muted">{r.summary}</span>}
                        <span className="mt-1 block text-xs text-brand-400">{r.url}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl">
            <p className="text-lg text-ink">{query ? "Try a different word, or one of these:" : "Popular searches:"}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <Link
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="inline-block rounded-full border border-brand-200 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
            {query && (
              <div className="mt-10 rounded-3xl bg-brand-50 p-6">
                <p className="font-semibold text-brand-900">Can&apos;t find what you need?</p>
                <p className="mt-1 text-muted">Send us a message and our team will help.</p>
                <ButtonLink href="/contact" className="mt-4">
                  Contact us
                </ButtonLink>
              </div>
            )}
          </div>
        )}
      </Container>
    </>
  );
}
