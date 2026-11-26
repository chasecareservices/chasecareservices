import type { Metadata } from "next";
import { ServiceGrid } from "@/components/services";
import { ButtonLink, PageHero, Section } from "@/components/ui";
import { bannerFor } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Care Services",
  description:
    "Elderly care, disability and autism support, home care, community support, nanny and housekeeping services, therapy and professional services in Ghana.",
};

export default async function CareServicesPage() {
  return (
    <>
      <PageHero
        image={await bannerFor("care-services")}
        eyebrow="Care Services"
        title="Professional, person-centred care"
        intro="Care tailored to each person's needs, preferences, culture and circumstances — delivered by trained, supported carers."
        actions={
          <>
            <ButtonLink href="/register/client">Request Care</ButtonLink>
            <ButtonLink href="/diaspora" variant="light">
              Arrange care from abroad
            </ButtonLink>
          </>
        }
      />
      <Section>
        <ServiceGrid group="care" />
      </Section>
    </>
  );
}
