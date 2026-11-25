import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, PageHero } from "@/components/ui";
import { getSiteSettings } from "@/lib/content";
import { phoneDigits } from "@/lib/format";
import { LEGAL_DOCUMENTS, getLegalDocument, linkPolicies, type LegalBlock } from "@/lib/legal";

export function legalMetadata(slug: string): Metadata {
  const doc = getLegalDocument(slug);
  return doc ? { title: doc.title, description: doc.summary } : {};
}

function Text({ text, slug }: { text: string; slug: string }) {
  return (
    <>
      {linkPolicies(text, slug).map((part, i) =>
        "href" in part ? (
          <Link key={i} href={part.href} className="font-medium text-brand-700 underline underline-offset-2">
            {part.text}
          </Link>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function Block({ block, slug }: { block: LegalBlock; slug: string }) {
  if (typeof block === "string") {
    return (
      <p>
        <Text text={block} slug={slug} />
      </p>
    );
  }
  return (
    <ul className="list-disc space-y-2 pl-6 marker:text-accent-500">
      {block.list.map((item) => (
        <li key={item}>
          <Text text={item} slug={slug} />
        </li>
      ))}
    </ul>
  );
}

/** Renders one of the policies in src/lib/legal, with a contents list and our contact details. */
export async function LegalPage({ slug }: { slug: string }) {
  const doc = getLegalDocument(slug);
  if (!doc) notFound();
  const settings = await getSiteSettings();

  return (
    <>
      <PageHero eyebrow="Policies" title={doc.title} intro={doc.summary} />
      <Container className="grid gap-12 py-12 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-32 lg:h-fit">
          <p className="text-sm text-muted">
            Last updated {doc.lastUpdated} · Version {doc.version}
          </p>
          <nav aria-label="On this page" className="mt-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent-700">On this page</p>
            <ol className="space-y-1.5 text-sm">
              {doc.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-brand-800 hover:underline">
                    {s.heading}
                  </a>
                </li>
              ))}
              <li>
                <a href="#contact-us" className="text-brand-800 hover:underline">
                  Contact us
                </a>
              </li>
            </ol>
          </nav>
          <nav aria-label="Other policies" className="mt-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent-700">Other policies</p>
            <ul className="space-y-1.5 text-sm">
              {LEGAL_DOCUMENTS.filter((d) => d.slug !== doc.slug).map((d) => (
                <li key={d.slug}>
                  <Link href={`/${d.slug}`} className="text-brand-800 hover:underline">
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="max-w-3xl space-y-10 text-[1.0625rem] leading-relaxed text-ink">
          {doc.sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-32 space-y-4">
              <h2 className="text-2xl font-bold text-brand-900">
                <span className="mr-2 text-accent-600">{i + 1}.</span>
                {section.heading}
              </h2>
              {section.blocks.map((block, bi) => (
                <Block key={bi} block={block} slug={doc.slug} />
              ))}
            </section>
          ))}

          <section id="contact-us" className="scroll-mt-32 rounded-3xl bg-brand-50 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-brand-900">Contact us</h2>
            <p className="mt-3">
              For questions about this policy, or to use your rights, contact {settings.organisation_name}:
            </p>
            <ul className="mt-4 space-y-2">
              {settings.email && (
                <li>
                  Email:{" "}
                  <a href={`mailto:${settings.email}`} className="font-medium text-brand-700 underline">
                    {settings.email}
                  </a>
                </li>
              )}
              {settings.phone && (
                <li>
                  Phone:{" "}
                  <a href={`tel:${phoneDigits(settings.phone)}`} className="font-medium text-brand-700 underline">
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings.address && <li>Post: {settings.address}</li>}
              <li>
                Or use our{" "}
                <Link href="/contact" className="font-medium text-brand-700 underline">
                  contact form
                </Link>
                .
              </li>
            </ul>
          </section>
        </article>
      </Container>
    </>
  );
}
