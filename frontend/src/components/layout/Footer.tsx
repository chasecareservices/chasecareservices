import Link from "next/link";
import { LanguageSelect } from "@/components/language/LanguageSelect";
import { Logo } from "@/components/Logo";
import { getNavigation, getSiteSettings } from "@/lib/content";
import { phoneDigits, whatsappLink } from "@/lib/format";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

type OpeningHours = { days?: string; hours?: string }[];
type SocialLinks = Record<string, string>;

const QUICK_LINKS = [
  { label: "Care Services", href: "/care-services" },
  { label: "Diaspora Services", href: "/diaspora" },
  { label: "Respite & Accommodation", href: "/respite" },
  { label: "ChaseCare Academy", href: "/academy" },
  { label: "Join Our Team", href: "/join-our-team" },
  { label: "News & Blog", href: "/journal" },
];

/** Used if the footer menu in the database is empty: the policies in src/lib/legal. */
const LEGAL_FALLBACK = LEGAL_DOCUMENTS.map((d) => ({ label: d.title, href: `/${d.slug}` }));

export async function Footer() {
  const [settings, footerNav] = await Promise.all([getSiteSettings(), getNavigation("footer")]);
  const hours = (Array.isArray(settings.opening_hours) ? settings.opening_hours : []) as OpeningHours;
  const social = (settings.social_links && typeof settings.social_links === "object" ? settings.social_links : {}) as SocialLinks;
  const legal = footerNav.length ? footerNav.map((n) => ({ label: n.label, href: n.href })) : LEGAL_FALLBACK;

  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:px-8">
        <div className="lg:col-span-1">
          <Logo inverted markClassName="h-10 w-auto flex-none" />
          {settings.supporting_statement && <p className="mt-4 text-sm leading-relaxed text-brand-200">{settings.supporting_statement}</p>}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-400">Explore</h2>
          <ul className="space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-400">Contact</h2>
          <ul className="space-y-2 text-sm">
            {settings.phone && (
              <li>
                <a href={`tel:${phoneDigits(settings.phone)}`} className="hover:text-white">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.whatsapp_number && (
              <li>
                <a href={whatsappLink(settings.whatsapp_number)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  WhatsApp us
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="hover:text-white">
                  {settings.email}
                </a>
              </li>
            )}
            {settings.address && <li>{settings.address}</li>}
            <li>
              <Link href="/contact" className="font-semibold text-white underline underline-offset-4">
                Send us a message
              </Link>
            </li>
          </ul>
        </div>

        <div>
          {hours.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-400">Opening hours</h2>
              <ul className="mb-6 space-y-1 text-sm">
                {hours.map((h, i) => (
                  <li key={i}>
                    <span className="text-brand-200">{h.days}</span> {h.hours}
                  </li>
                ))}
              </ul>
            </>
          )}
          {Object.keys(social).length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-400">Follow us</h2>
              <ul className="flex flex-wrap gap-3 text-sm">
                {Object.entries(social).map(([name, url]) => (
                  <li key={name}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-white">
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className={hours.length > 0 || Object.keys(social).length > 0 ? "mt-8" : ""}>
            <LanguageSelect />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-brand-200 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {settings.organisation_name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-4">
            {legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
