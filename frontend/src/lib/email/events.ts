/** Emails to people who register for a community event. Kept free of server code. */
import { layout } from "@/lib/email/alerts";
import { renderCopy, type Copy } from "@/lib/email/templates";
import { attendLabel, eventDate, eventTime } from "@/lib/events";

export type EventEmailInput = {
  event: { slug: string; title: string; starts_at: string; ends_at: string | null; venue: string | null; topic: string | null };
  registration: { full_name: string; attend_mode: string; token: string };
  onlineUrl: string | null;
};

function rows({ event, registration, onlineUrl }: EventEmailInput): [string, string][] {
  return [
    ["Event", event.title],
    ...(event.topic ? ([["Topic", event.topic]] as [string, string][]) : []),
    ["Date", eventDate(event.starts_at)],
    ["Time", `${eventTime(event.starts_at, event.ends_at)} (Ghana time)`],
    ["You'll join", attendLabel(registration.attend_mode)],
    registration.attend_mode === "online"
      ? ["Online link", onlineUrl ?? "We'll email the link before the event"]
      : ["Where", event.venue ?? "We'll confirm the venue before the event"],
  ];
}

function footer(site: string, input: EventEmailInput) {
  return `Add it to your calendar: ${site}/api/events/${input.event.slug}/calendar. Can't come any more? Let us know so someone else can have your place: ${site}/events/cancel/${input.registration.token}`;
}

export function registrationConfirmation(input: EventEmailInput, site: string, copy?: Partial<Copy> | null) {
  const first = input.registration.full_name.split(/\s+/)[0];
  const c = renderCopy("event_confirmation", copy, { first_name: first, event: input.event.title, date: eventDate(input.event.starts_at) });
  const { html, text } = layout(c.heading, rows(input), { label: "See the event details", href: `${site}/community/events/${input.event.slug}` }, footer(site, input), c.message);
  return { subject: c.subject, html, text };
}

export function eventReminder(input: EventEmailInput, site: string, copy?: Partial<Copy> | null) {
  const first = input.registration.full_name.split(/\s+/)[0];
  const c = renderCopy("event_reminder", copy, { first_name: first, event: input.event.title, date: eventDate(input.event.starts_at) });
  const { html, text } = layout(c.heading, rows(input), { label: "See the event details", href: `${site}/community/events/${input.event.slug}` }, footer(site, input), c.message);
  return { subject: c.subject, html, text };
}
