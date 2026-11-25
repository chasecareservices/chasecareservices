import { LegalPage, legalMetadata } from "@/components/LegalPage";

export const revalidate = 300;

export const metadata = legalMetadata("privacy-policy");

export default function Page() {
  return <LegalPage slug="privacy-policy" />;
}
