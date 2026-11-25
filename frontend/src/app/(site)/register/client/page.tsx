import type { Metadata } from "next";
import { CareRequestForm } from "@/components/forms/CareRequestForm";
import { Container, PageHero } from "@/components/ui";
import { PAGE_BANNERS } from "@/lib/images";

export const metadata: Metadata = {
  title: "Request Care",
  description: "Tell us about the care you or your loved one needs in Ghana. We'll review your request and contact you.",
};

type Props = { searchParams: Promise<{ abroad?: string; service?: string }> };

export default async function ClientRegistrationPage({ searchParams }: Props) {
  const { abroad, service } = await searchParams;
  return (
    <>
      <PageHero
        image={PAGE_BANNERS["register/client"]}
        eyebrow="Client Registration"
        title="I Need Care"
        intro="Tell us a little about who needs care and what support would help. It takes about 3 minutes, and a member of our team will contact you to discuss it."
      />
      <Container className="max-w-3xl py-14">
        <CareRequestForm abroad={abroad === "1"} service={service} />
      </Container>
    </>
  );
}
