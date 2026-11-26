import type { Metadata } from "next";
import { ServiceGrid } from "@/components/services";
import { ButtonLink, CheckList, PageHero, Pathway, Section } from "@/components/ui";
import { bannerFor } from "@/lib/content";
import { HOME_COUNTRIES } from "@/lib/site-copy";

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
      <Section
        eyebrow="Back home"
        title="Professional caregivers for your loved ones back home"
        intro="We cater for families abroad looking for trained, professional caregivers to look after their loved ones back home in:"
      >
        <ul className="grid gap-4 sm:grid-cols-3">
          {HOME_COUNTRIES.map((c) => (
            <li key={c} className="rounded-2xl border border-brand-100 bg-white p-6 text-center text-xl font-bold text-brand-900">
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-muted">We match. We care. You relax — with regular updates, wherever you are in the world.</p>
      </Section>
      <Section tone="tint" title="How it works">
        <Pathway steps={["Tell us about your loved one", "Free consultation", "Care plan agreed", "Care begins, with regular updates"]} />
      </Section>
      <Section title="What we can arrange">
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
