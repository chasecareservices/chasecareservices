import type { Metadata } from "next";
import { EventCard } from "@/components/events/EventCard";
import { EventDetail } from "@/components/events/EventDetail";
import { CheckList, Container, PageHero } from "@/components/ui";
import { bannerFor, getPage } from "@/lib/content";
import { FORUM_TOPICS } from "@/lib/events";
import { getEvent, getUpcomingEvents } from "@/lib/events-data";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("community/monthly-forum");
  return {
    title: page?.seo_title ?? "Monthly ChaseCare Community Forum",
    description: page?.seo_description ?? "An open forum on the third Thursday of every month for families, carers, professionals and anyone interested in care. Register free.",
  };
}

export default async function MonthlyForumPage() {
  const [page, forums] = await Promise.all([getPage("community/monthly-forum"), getUpcomingEvents("forum")]);
  const next = forums.find((f) => f.status === "published") ?? forums[0];
  const found = next ? await getEvent(next.slug) : null;
  const later = forums.filter((f) => f.id !== next?.id).slice(0, 3);

  return (
    <>
      <PageHero
        image={await bannerFor("community/monthly-forum")}
        eyebrow="Every third Thursday"
        title={page?.title ?? "Monthly ChaseCare Community Forum"}
        intro={
          page?.summary ??
          "An open forum held on the third Thursday of every month for families, carers, professionals and anyone interested in care. In person, and online."
        }
      />
      {found && (
        <Container className="py-12">
          <h2 className="mb-6 text-3xl font-bold text-brand-900">
            Next forum{found.event.topic ? `: ${found.event.topic}` : ""}
          </h2>
          <EventDetail event={found.event} placesLeft={found.placesLeft} headingId="forum-register-h" />
        </Container>
      )}
      <section aria-labelledby="topics-h" className="bg-brand-50 py-12">
        <Container>
          <h2 id="topics-h" className="text-3xl font-bold text-brand-900">
            Topics we cover
          </h2>
          <div className="mt-6 max-w-3xl">
            <CheckList items={FORUM_TOPICS} />
          </div>
        </Container>
      </section>
      {later.length > 0 && (
        <Container className="py-12">
          <h2 className="text-3xl font-bold text-brand-900">Later forums</h2>
          <ul className="mt-6 grid gap-4 lg:grid-cols-2">
            {later.map((f) => (
              <EventCard key={f.id} event={f} />
            ))}
          </ul>
        </Container>
      )}
    </>
  );
}
