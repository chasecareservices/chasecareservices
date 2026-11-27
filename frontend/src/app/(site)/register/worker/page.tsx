import type { Metadata } from "next";
import { WorkerApplicationForm } from "@/components/forms/WorkerApplicationForm";
import { Container, PageHero } from "@/components/ui";
import { bannerFor } from "@/lib/content";

export const metadata: Metadata = {
  title: "Apply to Join Our Team",
  description: "Apply to work with Chase Care Services as a caregiver, nurse, support worker, nanny or healthcare professional in Ghana.",
};

export default async function WorkerApplicationPage() {
  return (
    <>
      <PageHero
        image={await bannerFor("join-our-team")}
        eyebrow="Careers"
        title="Apply to join our team"
        intro="It takes about 5 minutes. We'll contact you about an interview. Every worker is screened and trained before their first placement."
      />
      <Container className="max-w-3xl py-14">
        <WorkerApplicationForm />
      </Container>
    </>
  );
}
