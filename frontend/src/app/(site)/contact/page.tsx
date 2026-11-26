import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { isEnquiryType } from "@/lib/enquiry-topics";
import { ButtonLink, Container, PageHero } from "@/components/ui";
import { getSiteSettings, bannerFor } from "@/lib/content";
import { phoneDigits, whatsappLink } from "@/lib/format";
import { OFFICE_LOCATIONS, OTHER_CONTACTS } from "@/lib/site-copy";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Call, WhatsApp, email or send a message to Chase Care Services.",
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

type OpeningHours = { days?: string; hours?: string }[];

export default async function ContactPage({ searchParams }: Props) {
  const params = await searchParams;
  const settings = await getSiteSettings();
  const topic = isEnquiryType(params.topic) ? params.topic : "contact";
  const context: Record<string, string> = {};
  if (params.course) context.course = params.course;
  if (params.service) context.service = params.service;
  const hours = (Array.isArray(settings.opening_hours) ? settings.opening_hours : []) as OpeningHours;

  return (
    <>
      <PageHero
        image={await bannerFor("contact")}
        eyebrow="Contact ChaseCare"
        title="We're here to help"
        intro="Call, WhatsApp or send us a message. Families in Ghana and abroad are welcome."
        actions={
          <>
            {settings.phone && (
              <ButtonLink href={`tel:${phoneDigits(settings.phone)}`} variant="light">
                Call Us
              </ButtonLink>
            )}
            {settings.whatsapp_number && <ButtonLink href={whatsappLink(settings.whatsapp_number)}>WhatsApp Us</ButtonLink>}
            <ButtonLink href="/register/client" variant="light">
              Request Care
            </ButtonLink>
            <ButtonLink href="/join-our-team" variant="light">
              Join Our Team
            </ButtonLink>
          </>
        }
      />
      <Container className="grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="mb-6 text-2xl font-bold text-brand-900">Send us a message</h2>
          <ContactForm initialTopic={topic} initialSubject={params.subject ?? ""} context={context} />
        </div>
        <aside className="h-fit space-y-6 rounded-3xl bg-brand-50 p-6">
          <div>
            <h2 className="font-semibold text-brand-900">Contact details</h2>
            <ul className="mt-3 space-y-2 text-ink">
              {settings.phone && (
                <li>
                  Phone:{" "}
                  <a className="font-medium text-brand-700 underline" href={`tel:${phoneDigits(settings.phone)}`}>
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings.whatsapp_number && (
                <li>
                  WhatsApp:{" "}
                  <a className="font-medium text-brand-700 underline" href={whatsappLink(settings.whatsapp_number)} target="_blank" rel="noopener noreferrer">
                    {settings.whatsapp_number}
                  </a>
                </li>
              )}
              {settings.email && (
                <li>
                  Email:{" "}
                  <a className="font-medium text-brand-700 underline" href={`mailto:${settings.email}`}>
                    {settings.email}
                  </a>
                </li>
              )}
              {OTHER_CONTACTS.map((c) => (
                <li key={c.href}>
                  {c.label}:{" "}
                  <a className="font-medium text-brand-700 underline" href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                    {c.value}
                  </a>
                </li>
              ))}
              {!settings.phone && !settings.email && !settings.whatsapp_number && (
                <li className="text-muted">Our phone number and email will be listed here shortly. Please use the form for now.</li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-brand-900">Our offices</h2>
            <ul className="mt-3 space-y-1 text-ink">
              {OFFICE_LOCATIONS.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">Please contact us to confirm availability for your location.</p>
          </div>
          {hours.length > 0 && (
            <div>
              <h2 className="font-semibold text-brand-900">Opening hours</h2>
              <ul className="mt-3 space-y-1 text-ink">
                {hours.map((h, i) => (
                  <li key={i}>
                    {h.days}: {h.hours}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {settings.map_url && (
            <a href={settings.map_url} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-brand-700 underline">
              View on map
            </a>
          )}
        </aside>
      </Container>
    </>
  );
}
