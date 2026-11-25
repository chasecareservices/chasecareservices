import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ServiceCard } from "@/components/cards";
import { ButtonLink, CheckList, EmptyState, PageHero, Section } from "@/components/ui";
import { getService, getServices, type ServiceGroup } from "@/lib/content";
import { paragraphs } from "@/lib/format";

export const SERVICE_GROUP_PATH: Record<ServiceGroup, string> = {
  care: "/care-services",
  diaspora: "/diaspora",
  respite: "/respite",
  partnership: "/schools-and-hospitals",
};

export async function ServiceGrid({ group }: { group: ServiceGroup }) {
  const services = await getServices(group);
  if (!services.length) {
    return <EmptyState title="Services are being updated">Please contact us to discuss what you need.</EmptyState>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <ServiceCard key={s.id} service={s} basePath={SERVICE_GROUP_PATH[group]} />
      ))}
    </div>
  );
}

export async function serviceMetadata(slug: string): Promise<Metadata> {
  const service = await getService(slug);
  if (!service) return {};
  return {
    title: service.seo_title ?? service.name,
    description: service.seo_description ?? service.summary ?? undefined,
  };
}

const GROUP_LABEL: Record<ServiceGroup, string> = {
  care: "Care Services",
  diaspora: "Diaspora Services",
  respite: "Respite & Accommodation",
  partnership: "Partnerships",
};

export async function ServiceDetail({ slug, group }: { slug: string; group: ServiceGroup }) {
  const service = await getService(slug);
  if (!service || service.service_group !== group) notFound();
  const related = (await getServices(group)).filter((s) => s.id !== service.id).slice(0, 3);
  const enquiryHref =
    group === "respite"
      ? `/contact?topic=respite&service=${service.slug}`
      : `/register/client?service=${encodeURIComponent(service.slug)}`;

  return (
    <>
      <PageHero
        eyebrow={GROUP_LABEL[group]}
        title={service.name}
        intro={service.summary}
        actions={
          <>
            <ButtonLink href={enquiryHref}>{service.cta_label || "Request this service"}</ButtonLink>
            <ButtonLink href="/contact" variant="light">
              Ask a question
            </ButtonLink>
          </>
        }
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 text-lg leading-relaxed">
            {paragraphs(service.description).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {service.includes.length > 0 && (
              <>
                <h2 className="pt-2 text-2xl font-bold text-brand-900">What&apos;s included</h2>
                <CheckList items={service.includes} />
              </>
            )}
          </div>
          <aside className="h-fit rounded-3xl bg-brand-50 p-6">
            {service.audience && (
              <>
                <h2 className="font-semibold text-brand-900">Who it&apos;s for</h2>
                <p className="mt-2 text-muted">{service.audience}</p>
              </>
            )}
            <h2 className="mt-6 font-semibold text-brand-900 first:mt-0">Arranging care from abroad?</h2>
            <p className="mt-2 text-muted">We support families in the diaspora with regular updates and care coordination.</p>
            <div className="mt-5 flex flex-col gap-3">
              <ButtonLink href={enquiryHref}>{service.cta_label || "Request this service"}</ButtonLink>
              <ButtonLink href="/diaspora" variant="outline">
                Diaspora services
              </ButtonLink>
            </div>
          </aside>
        </div>
      </Section>
      {related.length > 0 && (
        <Section tone="tint" title="Related services">
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((s) => (
              <ServiceCard key={s.id} service={s} basePath={SERVICE_GROUP_PATH[group]} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
