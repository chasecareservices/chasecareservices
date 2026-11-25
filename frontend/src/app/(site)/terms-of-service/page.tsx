import { LegalPage, legalMetadata } from "@/components/LegalPage";

export const revalidate = 300;

export const metadata = legalMetadata("terms-of-service");

export default function Page() {
  return <LegalPage slug="terms-of-service" />;
}
