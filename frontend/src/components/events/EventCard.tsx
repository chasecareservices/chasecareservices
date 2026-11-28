import Link from "next/link";
import { eventDate, eventKindLabel, eventTime } from "@/lib/events";
import type { PublicEvent } from "@/lib/events-data";

export function EventCard({ event }: { event: PublicEvent }) {
  const d = new Date(event.starts_at);
  const cancelled = event.status === "cancelled";
  return (
    <li className="relative flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-100 hover:ring-brand-400">
      <div className={`flex w-16 flex-none flex-col items-center justify-center rounded-xl py-2 text-white ${cancelled ? "bg-gray-500" : "bg-brand-800"}`}>
        <span className="text-2xl font-bold leading-none">{d.getUTCDate()}</span>
        <span className="text-xs uppercase">{d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">
          {eventKindLabel(event.kind)}
          {event.topic ? ` · ${event.topic}` : ""}
        </p>
        <h3 className="text-lg font-bold text-brand-900">
          <Link href={`/community/events/${event.slug}`} className="after:absolute after:inset-0 hover:underline">
            {event.title}
          </Link>
        </h3>
        <p className="text-sm text-muted">
          {eventDate(event.starts_at)} · {eventTime(event.starts_at, event.ends_at)}
          {event.venue ? ` · ${event.venue}` : ""}
          {event.online ? " · Online too" : ""}
        </p>
        {cancelled ? <p className="mt-1 text-sm font-semibold text-red-800">Cancelled</p> : event.summary && <p className="mt-1 text-sm">{event.summary}</p>}
      </div>
    </li>
  );
}
