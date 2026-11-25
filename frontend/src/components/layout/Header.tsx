import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MobileNav, type SimpleLink } from "@/components/layout/MobileNav";
import { getActiveAnnouncements, getNavigation, getSiteSettings } from "@/lib/content";
import { phoneDigits, whatsappLink } from "@/lib/format";

/** Used if the navigation table is empty or unreachable. */
const FALLBACK_NAV: SimpleLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Care Services", href: "/care-services" },
  { label: "Training Academy", href: "/academy" },
  { label: "Respite & Accommodation", href: "/respite" },
  { label: "Wellbeing Hub", href: "/wellbeing" },
  { label: "Join Our Team", href: "/join-our-team" },
  { label: "Client Registration", href: "/register/client" },
  { label: "Resources", href: "/journal" },
  { label: "Shop", href: "/shop" },
  { label: "Contact", href: "/contact" },
];

const REQUEST_CARE: SimpleLink = { label: "Request Care", href: "/register/client" };

export async function Header() {
  const [nav, settings, announcements] = await Promise.all([
    getNavigation("main"),
    getSiteSettings(),
    getActiveAnnouncements(),
  ]);
  const links: SimpleLink[] = nav.length
    ? nav.filter((n) => !n.parent_id).map((n) => ({ label: n.label, href: n.href }))
    : FALLBACK_NAV;
  const desktopLinks = links.filter((l) => l.href !== "/" && l.href !== REQUEST_CARE.href);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {announcements.map((a) => (
        <div key={a.id} className="bg-accent-500 px-4 py-2 text-center text-sm font-medium text-brand-950">
          {a.link_url ? (
            <a href={a.link_url} className="underline underline-offset-2">
              {a.message}
            </a>
          ) : (
            a.message
          )}
        </div>
      ))}

      <div className="hidden bg-brand-900 text-sm text-brand-100 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <p>Supporting families in Ghana and across the diaspora</p>
          <div className="flex items-center gap-5">
            {settings.phone && (
              <a href={`tel:${phoneDigits(settings.phone)}`} className="hover:text-white">
                Call {settings.phone}
              </a>
            )}
            {settings.whatsapp_number && (
              <a href={whatsappLink(settings.whatsapp_number)} className="hover:text-white" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            )}
            <Link href="/diaspora" className="font-semibold text-accent-400 hover:text-accent-300">
              I live abroad — arrange care in Ghana
            </Link>
          </div>
        </div>
      </div>

      <div className="relative border-b border-brand-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo compactOnLaptop />
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center text-[0.8125rem] font-medium text-brand-900">
              {desktopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="whitespace-nowrap rounded-full px-2 py-2 hover:bg-brand-50 hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={REQUEST_CARE.href}
              className="hidden min-h-11 items-center whitespace-nowrap rounded-full bg-accent-500 px-5 text-sm font-semibold text-brand-950 hover:bg-accent-400 sm:inline-flex"
            >
              {REQUEST_CARE.label}
            </Link>
            <MobileNav links={links} cta={REQUEST_CARE} />
          </div>
        </div>
      </div>
    </header>
  );
}
