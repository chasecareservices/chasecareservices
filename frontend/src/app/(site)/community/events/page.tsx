import type { Metadata } from "next";
import { EventCard } from "@/components/events/EventCard";
import { ButtonLink, Container, PageHero } from "@/components/ui";
import { bannerFor } from "@/lib/content";
import { getUpcomingEvents } from "@/lib/events-data";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Community Events",
  description: "The Monthly ChaseCare Community Forum, community outreach, awareness and school programmes, health initiatives and volunteering in Ghana.",
};

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <>
      <PageHero
        image={await bannerFor("community")}
        eyebrow="Community"
        title="Community events"
        intro="Forums, outreach, awareness and school programmes, health initiatives and volunteering. Everyone is welcome."
        actions={<ButtonLink href="/community/monthly-forum">The Monthly Forum</ButtonLink>}
      />
      <Container className="py-14">
        <h2 className="text-3xl font-bold text-brand-900">Coming up</h2>
        {events.length ? (
          <ul className="mt-8 grid gap-4 lg:grid-cols-2">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-muted">New events will be announced here soon.</p>
        )}
        <div className="mt-12 rounded-3xl bg-brand-50 p-8">
          <h2 className="text-2xl font-bold text-brand-900">Want to volunteer or partner with us?</h2>
          <p className="mt-2 max-w-2xl">We work with schools, hospitals, churches, businesses and community groups. Tell us how you&apos;d like to get involved.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/contact?topic=partnership" variant="secondary">
              Partner with us
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              Volunteer
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
