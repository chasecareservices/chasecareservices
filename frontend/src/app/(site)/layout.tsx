import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { QuickContact } from "@/components/layout/QuickContact";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="pb-20 sm:pb-0">
        {children}
      </main>
      <Footer />
      <QuickContact />
    </>
  );
}
