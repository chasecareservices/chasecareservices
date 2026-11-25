import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBlocks, toBlocks } from "@/components/PageBlocks";
import { ButtonLink, CheckList, Container, PageHero, Pathway, Section } from "@/components/ui";
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
        <div className="py-10">
          <PageBlocks blocks={toBlocks(page.body)} />
        </div>
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
      {copy.sections.map((section, i) => (
        <Section key={section.heading} tone={i % 2 === 1 ? "tint" : "white"} title={section.heading} intro={section.text}>
          {section.pathway && <Pathway steps={section.pathway} />}
          {section.items && <CheckList items={section.items} columns={section.items.length > 8 ? 3 : 2} />}
        </Section>
      ))}
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
