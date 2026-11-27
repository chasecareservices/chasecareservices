import { eventIcs } from "@/lib/events";
import { getEvent } from "@/lib/events-data";

/** Download an event as a calendar file (.ics) for phones and email calendars. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getEvent(slug);
  if (!found) return new Response("Not found", { status: 404 });
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  return new Response(eventIcs(found.event, `${site}/community/events/${slug}`), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.ics"`,
      "cache-control": "public, max-age=300",
    },
  });
}
