import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBlocks, toBlocks } from "@/components/PageBlocks";
import { RelatedInfo } from "@/components/RelatedInfo";
import { ButtonLink, CheckList, Container, PageHero, Pathway } from "@/components/ui";
import { getPage } from "@/lib/content";
import { formatLongDate, nextForumDate } from "@/lib/forum";
import { PAGE_BANNERS } from "@/lib/images";
import { PAGE_COPY } from "@/lib/site-copy";

/** A published page from the database, and/or built-in copy, for a slug like "community/monthly-forum". */
export async function resolveCmsPage(slug: string) {
  const page = await getPage(slug); // published pages only (database rule)
  return { page, copy: PAGE_COPY[slug] };
}

export async function cmsPageMetadata(slug: string): Promise<Metadata> {
  const { page, copy } = await resolveCmsPage(slug);
  if (page) return { title: page.seo_title ?? page.title, description: page.seo_description ?? page.summary ?? undefined };
  if (copy) return { title: copy.title, description: copy.intro };
  return {};
}

/**
 * Pages the owner manages in the admin dashboard (About sub-pages, Wellbeing, Join Our Team,
 * legal pages…). A published page from the database wins; otherwise the built-in copy from
 * the client proposal is shown; otherwise 404.
 */
export async function CmsPageView({ slug }: { slug: string }) {
  const { page, copy } = await resolveCmsPage(slug);
  const isForum = slug === "community/monthly-forum";

  if (page) {
    return (
      <>
        <PageHero title={page.title} intro={page.summary} image={PAGE_BANNERS[slug]} />
        {isForum && <ForumDate />}
        <Container className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <PageBlocks blocks={toBlocks(page.body)} />
          </div>
          <aside className="lg:sticky lg:top-32 lg:h-fit">
            <RelatedInfo pathname={`/${slug}`} />
          </aside>
        </Container>
      </>
    );
  }

  if (!copy) notFound();

  return (
    <>
      <PageHero
        image={PAGE_BANNERS[slug]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        intro={copy.intro}
        actions={copy.ctas.map((c, i) => (
          <ButtonLink key={c.href} href={c.href} variant={i === 0 ? "primary" : "light"}>
            {c.label}
          </ButtonLink>
        ))}
      />
      {isForum && <ForumDate />}
      <Container className="grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="space-y-12">
          {copy.sections.map((section) => (
            <section key={section.heading} className="space-y-5">
              <h2 className="text-2xl font-bold text-brand-900 sm:text-3xl">{section.heading}</h2>
              {section.text && <p className="max-w-3xl text-lg leading-relaxed text-muted">{section.text}</p>}
              {section.pathway && <Pathway steps={section.pathway} />}
              {section.items && <CheckList items={section.items} columns={2} />}
            </section>
          ))}
        </div>
        <aside className="lg:sticky lg:top-32 lg:h-fit">
          <RelatedInfo pathname={`/${slug}`} />
        </aside>
      </Container>
    </>
  );
}

function ForumDate() {
  return (
    <div className="bg-accent-500">
      <Container className="py-5 text-center text-lg text-brand-950">
        Next forum: <strong>{formatLongDate(nextForumDate())}</strong>
      </Container>
    </div>
  );
}
