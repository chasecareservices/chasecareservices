import { EventRegistrationForm } from "@/components/events/EventRegistrationForm";
import { eventDate, eventTime, isOver } from "@/lib/events";
import type { PublicEvent } from "@/lib/events-data";

/** Date, place, speaker and registration for one event. Shared by the event page and the forum page. */
export function EventDetail({ event, placesLeft, headingId = "register-h" }: { event: PublicEvent; placesLeft: number | null; headingId?: string }) {
  const over = isOver(event);
  const cancelled = event.status === "cancelled";
  const full = placesLeft === 0;
  const canRegister = !over && !cancelled && event.registration_open && (!full || event.online);
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-brand-50 p-4">
            <dt className="text-sm font-semibold text-muted">When</dt>
            <dd className="font-bold text-brand-900">{eventDate(event.starts_at)}</dd>
            <dd>{eventTime(event.starts_at, event.ends_at)} (Ghana time)</dd>
          </div>
          <div className="rounded-2xl bg-brand-50 p-4">
            <dt className="text-sm font-semibold text-muted">Where</dt>
            <dd className="font-bold text-brand-900">{event.venue ?? "To be confirmed"}</dd>
            {event.online && <dd>You can also join online: we email the link when you register.</dd>}
          </div>
          {event.topic && (
            <div className="rounded-2xl bg-brand-50 p-4">
              <dt className="text-sm font-semibold text-muted">Topic</dt>
              <dd className="font-bold text-brand-900">{event.topic}</dd>
            </div>
          )}
          {event.speaker && (
            <div className="rounded-2xl bg-brand-50 p-4">
              <dt className="text-sm font-semibold text-muted">Speaker</dt>
              <dd className="font-bold text-brand-900">{event.speaker}</dd>
            </div>
          )}
        </dl>
        {event.description && <p className="mt-8 whitespace-pre-line text-lg leading-relaxed">{event.description}</p>}
        <p className="mt-6">
          <a href={`/api/events/${event.slug}/calendar`} className="font-semibold text-brand-700 underline">
            Add to my calendar
          </a>
        </p>
      </div>
      <section aria-labelledby={headingId} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brand-100">
        <h2 id={headingId} className="text-2xl font-bold text-brand-900">
          Register
        </h2>
        {cancelled ? (
          <p className="mt-3 font-semibold text-red-800">This event has been cancelled. We&apos;re sorry for any inconvenience.</p>
        ) : over ? (
          <p className="mt-3 text-muted">This event has finished.</p>
        ) : !canRegister ? (
          <p className="mt-3 text-muted">{full ? "Sorry, this event is full." : "Registration is closed."}</p>
        ) : (
          <>
            <p className="mb-5 mt-1 text-sm text-muted">
              Free to attend.{placesLeft !== null && placesLeft > 0 && placesLeft <= 15 ? ` Only ${placesLeft} places left in the room.` : ""}
            </p>
            <EventRegistrationForm eventId={event.id} online={event.online} full={full} title={event.title} />
          </>
        )}
      </section>
    </div>
  );
}
