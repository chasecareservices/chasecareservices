import type { Metadata } from "next";
import { ServiceGrid } from "@/components/services";
import { ButtonLink, CheckList, PageHero, Pathway, Section } from "@/components/ui";
import { bannerFor } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Care for Loved Ones in Ghana",
  description:
    "Living abroad? Chase Care Services arranges trusted elderly care, disability support, welfare visits and care coordination for your loved ones in Ghana.",
};

export default async function DiasporaPage() {
  return (
    <>
      <PageHero
        image={await bannerFor("diaspora")}
        eyebrow="Diaspora Services"
        title="Care From Anywhere in the World"
        intro="Your loved one may be in Ghana while you are thousands of miles away. Chase Care Services helps families stay connected to their loved one's care through trusted, professional services and regular communication."
        actions={<ButtonLink href="/register/client?abroad=1">I Live Abroad — Arrange Care in Ghana</ButtonLink>}
      />
      <Section title="How it works">
        <Pathway steps={["Tell us about your loved one", "Free consultation", "Care plan agreed", "Care begins, with regular updates"]} />
      </Section>
      <Section tone="tint" title="What we can arrange">
        <div className="mb-10">
          <CheckList
            columns={3}
            items={[
              "Parent and elderly care",
              "Disability and autism support",
              "Home support",
              "Respite",
              "Hospital support",
              "Welfare visits",
              "Care coordination",
            ]}
          />
        </div>
        <ServiceGrid group="diaspora" />
      </Section>
    </>
  );
}
