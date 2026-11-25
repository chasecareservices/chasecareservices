import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBlocks, toBlocks } from "@/components/PageBlocks";
import { Badge, ButtonLink, CheckList, PageHero, Section } from "@/components/ui";
import { getCourse } from "@/lib/content";
import { certificationLabel, formatMoney } from "@/lib/format";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

const DELIVERY: Record<string, string> = { in_person: "In person", online: "Online", blended: "Blended" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourse((await params).slug);
  if (!course) return {};
  return { title: course.seo_title ?? course.title, description: course.seo_description ?? course.summary ?? undefined };
}

export default async function CoursePage({ params }: Props) {
  const course = await getCourse((await params).slug);
  if (!course) notFound();

  const facts = [
    { label: "Certificate", value: certificationLabel(course.certification_type) },
    course.accrediting_body ? { label: "Accredited by", value: course.accrediting_body } : null,
    course.duration_text ? { label: "Duration", value: course.duration_text } : null,
    { label: "Delivery", value: DELIVERY[course.delivery_mode] ?? course.delivery_mode },
    { label: "Fee", value: course.fee_amount != null ? formatMoney(course.fee_amount, course.fee_currency) : "Contact us" },
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <>
      <PageHero
        eyebrow={course.is_signature ? "Signature course" : course.category ?? "ChaseCare Academy"}
        title={course.title}
        intro={course.summary}
        actions={<ButtonLink href={`/contact?topic=course_registration&course=${course.slug}`}>Register for this course</ButtonLink>}
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
          </div>
          <aside className="h-fit rounded-3xl bg-brand-50 p-6">
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
        </div>
      </Section>
    </>
  );
}
