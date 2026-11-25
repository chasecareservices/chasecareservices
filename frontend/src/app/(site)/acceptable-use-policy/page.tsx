import { LegalPage, legalMetadata } from "@/components/LegalPage";

export const revalidate = 300;

export const metadata = legalMetadata("acceptable-use-policy");

export default function Page() {
  return <LegalPage slug="acceptable-use-policy" />;
}
