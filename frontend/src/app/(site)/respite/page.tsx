import type { Metadata } from "next";
import { ServiceGrid } from "@/components/services";
import { ButtonLink, PageHero, Section } from "@/components/ui";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Respite & Accommodation",
  description:
    "Planned respite for families and carers, and safe, supportive short stays for young people and adults with additional needs.",
};

export default function RespitePage() {
  return (
    <>
      <PageHero
        eyebrow="Respite & Accommodation"
        title="Time to rest, knowing your loved one is cared for"
        intro="Planned respite for parents and carers who need time to rest, attend appointments, travel or recharge — and safe, supportive short stays for young people and adults with additional needs."
        actions={<ButtonLink href="/contact?topic=respite">Make a respite enquiry</ButtonLink>}
      />
      <Section>
        <ServiceGrid group="respite" />
      </Section>
    </>
  );
}
