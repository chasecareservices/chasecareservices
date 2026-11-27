import "server-only";
import { cache } from "react";
import { getServerClient } from "@/lib/supabase/client";

export const EVENT_FIELDS = "id, slug, kind, title, topic, summary, description, speaker, starts_at, ends_at, venue, online, capacity, registration_open, status, image_path";
export type PublicEvent = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  topic: string | null;
  summary: string | null;
  description: string | null;
  speaker: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  online: boolean;
  capacity: number | null;
  registration_open: boolean;
  status: string;
  image_path: string | null;
};

/** Published (and cancelled) events from today on, soonest first. Makes sure the next forums exist. */
export const getUpcomingEvents = cache(async (kind?: string): Promise<PublicEvent[]> => {
  const supabase = getServerClient();
  if (!supabase) return [];
  await supabase.rpc("ensure_forums");
  let q = supabase
    .from("community_events")
    .select(EVENT_FIELDS)
    .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
    .order("starts_at")
    .limit(50);
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data ?? []) as PublicEvent[];
});

export const getEvent = cache(async (slug: string): Promise<{ event: PublicEvent; placesLeft: number | null } | null> => {
  const supabase = getServerClient();
  if (!supabase || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { data } = await supabase.from("community_events").select(EVENT_FIELDS).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const { data: left } = await supabase.rpc("event_places_left", { event: data.id });
  return { event: data as PublicEvent, placesLeft: typeof left === "number" ? left : null };
});
