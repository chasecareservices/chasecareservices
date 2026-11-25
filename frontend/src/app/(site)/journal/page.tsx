import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/cards";
import { EmptyState, PageHero, Section } from "@/components/ui";
import { getPostCategories, getPosts } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "The ChaseCare Journal",
  description: "Guidance on elderly care, autism, disability, dementia, parenting, caregiver support and diaspora care.",
};

type Props = { searchParams: Promise<{ category?: string }> };

export default async function JournalPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const [categories, posts] = await Promise.all([getPostCategories(), getPosts(category)]);
  const active = categories.find((c) => c.slug === category);

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="The ChaseCare Journal"
        intro="Practical guidance and stories on care, wellbeing, inclusion and community."
      />
      <Section>
        <nav aria-label="Journal categories" className="mb-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href="/journal"
                aria-current={!active ? "page" : undefined}
                className="inline-block rounded-full border border-brand-200 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 aria-[current=page]:border-brand-800 aria-[current=page]:bg-brand-800 aria-[current=page]:text-white"
              >
                All
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/journal?category=${c.slug}`}
                  aria-current={active?.slug === c.slug ? "page" : undefined}
                  className="inline-block rounded-full border border-brand-200 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 aria-[current=page]:border-brand-800 aria-[current=page]:bg-brand-800 aria-[current=page]:text-white"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {posts.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <EmptyState title={active ? `No articles in ${active.name} yet` : "Articles coming soon"}>
            New articles are published regularly — please check back.
          </EmptyState>
        )}
      </Section>
    </>
  );
}
