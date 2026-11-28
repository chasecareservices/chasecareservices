import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventDetail } from "@/components/events/EventDetail";
import { Container, PageHero } from "@/components/ui";
import { bannerFor, mediaUrl } from "@/lib/content";
import { eventKindLabel } from "@/lib/events";
import { getEvent } from "@/lib/events-data";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getEvent((await params).slug);
  return found ? { title: found.event.title, description: found.event.summary ?? undefined } : {};
}

export default async function EventPage({ params }: Props) {
  const found = await getEvent((await params).slug);
  if (!found) notFound();
  const { event, placesLeft } = found;
  const img = mediaUrl(event.image_path);
  return (
    <>
      <PageHero
        image={img ? { src: img, alt: "" } : await bannerFor(event.kind === "forum" ? "community/monthly-forum" : "community")}
        eyebrow={eventKindLabel(event.kind)}
        title={event.title}
        intro={event.summary ?? undefined}
      />
      <Container className="py-12">
        <p className="mb-6">
          <Link href={event.kind === "forum" ? "/community/monthly-forum" : "/community/events"} className="text-sm font-semibold text-brand-700 underline">
            ← {event.kind === "forum" ? "The Monthly Forum" : "All community events"}
          </Link>
        </p>
        <EventDetail event={event} placesLeft={placesLeft} />
      </Container>
    </>
  );
}
