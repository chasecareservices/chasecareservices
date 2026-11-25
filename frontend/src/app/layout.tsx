import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "./globals.css";
import { TranslateLoader } from "@/components/language/TranslateLoader";
import { getSiteSettings } from "@/lib/content";

export const viewport: Viewport = {
  themeColor: "#3b0a5e",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const seo = (settings.default_seo ?? {}) as { title?: string; description?: string };
  const title = seo.title ?? `${settings.organisation_name} — ${settings.tagline}`;
  const description =
    seo.description ??
    "Professional, person-centred care and support for individuals and families in Ghana and across the diaspora.";
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: title, template: `%s | ${settings.organisation_name}` },
    description,
    openGraph: {
      type: "website",
      siteName: settings.organisation_name,
      title,
      description,
      images: [{ url: "/brand/chase-care-hero.jpg", width: 640, height: 640, alt: "Chase Care Services" }],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen antialiased">
        {children}
        <TranslateLoader />
      </body>
    </html>
  );
}
