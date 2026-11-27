import Link from "next/link";
import type { Metadata } from "next";
import { CmsPageView, cmsPageMetadata } from "@/components/CmsPageView";
import { PageBlocks, toBlocks } from "@/components/PageBlocks";
import { RelatedInfo } from "@/components/RelatedInfo";
import { Badge, ButtonLink, CheckList, PageHero, Section } from "@/components/ui";
import { getCourse, courseImage } from "@/lib/content";
import { certificationLabel, formatMoney } from "@/lib/format";
import { formatHours, groupBySection } from "@/lib/learning";
import { getServerClient } from "@/lib/supabase/client";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

const DELIVERY: Record<string, string> = { in_person: "In person", online: "Online", blended: "Blended" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  // Not a course: it may be an Academy page such as /academy/workforce-standards.
  if (!course) return cmsPageMetadata(`academy/${slug}`);
  return { title: course.seo_title ?? course.title, description: course.seo_description ?? course.summary ?? undefined };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return <CmsPageView slug={`academy/${slug}`} />;
  const supabase = course.online_enabled ? getServerClient() : null;
  const { data: outline } = supabase ? await supabase.rpc("course_outline", { course: course.id }) : { data: null };
  const lessons = outline ?? [];
  const minutes = lessons.reduce((s, l) => s + (l.minutes ?? 0), 0);

  const facts = [
    { label: "Certificate", value: certificationLabel(course.certification_type) },
    course.accrediting_body ? { label: "Accredited by", value: course.accrediting_body } : null,
    course.duration_text ? { label: "Duration", value: course.duration_text } : null,
    course.cpd_hours ? { label: "CPD hours", value: formatHours(Number(course.cpd_hours)) } : null,
    lessons.length ? { label: "Online lessons", value: `${lessons.length}${minutes ? ` (about ${Math.max(1, Math.round(minutes / 60))} h)` : ""}` } : null,
    { label: "Delivery", value: DELIVERY[course.delivery_mode] ?? course.delivery_mode },
    { label: "Fee", value: course.fee_amount != null ? formatMoney(course.fee_amount, course.fee_currency) : "Contact us" },
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <>
      <PageHero
        image={courseImage(course) ?? undefined}
        eyebrow={course.is_signature ? "Signature course" : (course.category ?? "ChaseCare Academy")}
        title={course.title}
        intro={course.summary}
        actions={
          <ButtonLink href={`/contact?topic=course_registration&course=${course.slug}`}>Register for this course</ButtonLink>
        }
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <PageBlocks blocks={toBlocks(course.description)} />
            {course.learning_outcomes.length > 0 && (
              <>
                <h2 className="mb-4 text-2xl font-bold text-brand-900">What you will learn</h2>
                <CheckList items={course.learning_outcomes} />
              </>
            )}
            {lessons.length > 0 && (
              <section aria-labelledby="outline-h" className="mt-10">
                <h2 id="outline-h" className="mb-4 text-2xl font-bold text-brand-900">
                  Course content (online)
                </h2>
                {groupBySection(lessons).map((g, gi) => (
                  <div key={gi} className="mb-4">
                    {g.section && <h3 className="mb-2 font-semibold text-brand-800">{g.section}</h3>}
                    <ol className="divide-y divide-brand-100 rounded-2xl bg-white ring-1 ring-brand-100">
                      {g.lessons.map((l, li) => (
                        <li key={li} className="flex justify-between gap-4 px-4 py-3">
                          <span>{l.title}</span>
                          {l.minutes && <span className="text-sm text-muted">{l.minutes} min</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                <p className="text-sm text-muted">
                  Learn at your own pace on your phone or computer. Already enrolled?{" "}
                  <Link href="/learn" className="font-semibold text-brand-700 underline">
                    Sign in to start learning
                  </Link>
                  .
                </p>
              </section>
            )}
          </div>
          <div className="h-fit space-y-6 lg:sticky lg:top-32">
            <aside className="rounded-3xl bg-brand-50 p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {course.is_signature && <Badge tone="accent">Signature course</Badge>}
                <Badge>{certificationLabel(course.certification_type)}</Badge>
              </div>
              <dl className="space-y-3">
                {facts.map((f) => (
                  <div key={f.label} className="flex justify-between gap-4 border-b border-brand-100 pb-2 text-sm">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="text-right font-medium text-brand-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <ButtonLink href={`/contact?topic=course_registration&course=${course.slug}`} className="mt-6 w-full">
                Register for this course
              </ButtonLink>
            </aside>
            <RelatedInfo pathname={`/academy/${course.slug}`} />
          </div>
        </div>
      </Section>
    </>
  );
}
