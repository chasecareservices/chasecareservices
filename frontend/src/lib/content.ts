import "server-only";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { getServerClient } from "@/lib/supabase/client";

type Tables = Database["public"]["Tables"];
export type SiteSettings = Tables["site_settings"]["Row"];
export type NavItem = Tables["navigation_items"]["Row"];
export type Service = Tables["services"]["Row"];
export type ServiceGroup = Database["public"]["Enums"]["service_group"];
export type Page = Tables["pages"]["Row"];
export type Course = Tables["courses"]["Row"];
export type Post = Tables["posts"]["Row"] & { category: { slug: string; name: string } | null };
export type PostCategory = Tables["post_categories"]["Row"];
export type Product = Tables["products"]["Row"];
export type TeamMember = Tables["team_members"]["Row"];
export type Partner = Tables["partners"]["Row"];
export type Testimonial = Tables["testimonials"]["Row"];
export type Announcement = Tables["announcements"]["Row"];

/** Defaults used until Supabase is reachable or the owner fills in the settings. */
const DEFAULT_SETTINGS: SiteSettings = {
  id: true,
  organisation_name: "Chase Care Services",
  tagline: "Quality Care. Compassionate Support. Empowered Lives.",
  supporting_statement:
    "Person-centred care, professional support and training for individuals, families and communities in Ghana and across the diaspora.",
  phone: null,
  whatsapp_number: null,
  email: null,
  address: null,
  map_url: null,
  opening_hours: [],
  social_links: {},
  default_seo: {},
  cookie_banner_text: null,
  currency: "GHS",
  timezone: "Africa/Accra",
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

function logError(what: string, error: unknown) {
  if (error) console.error(`[content] Failed to load ${what}:`, error);
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const db = getServerClient();
  if (!db) return DEFAULT_SETTINGS;
  const { data, error } = await db.from("site_settings").select("*").maybeSingle();
  logError("site settings", error);
  return data ?? DEFAULT_SETTINGS;
});

export const getNavigation = cache(async (menu: "main" | "footer" | "cta"): Promise<NavItem[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db
    .from("navigation_items")
    .select("*")
    .eq("menu", menu)
    .order("sort_order");
  logError(`${menu} navigation`, error);
  return data ?? [];
});

export const getServices = cache(async (group?: ServiceGroup): Promise<Service[]> => {
  const db = getServerClient();
  if (!db) return [];
  let query = db.from("services").select("*").order("sort_order");
  if (group) query = query.eq("service_group", group);
  const { data, error } = await query;
  logError("services", error);
  return data ?? [];
});

export const getService = cache(async (slug: string): Promise<Service | null> => {
  const db = getServerClient();
  if (!db) return null;
  const { data, error } = await db.from("services").select("*").eq("slug", slug).maybeSingle();
  logError(`service ${slug}`, error);
  return data;
});

/** A published CMS page, or null (drafts are invisible to the public by database rule). */
export const getPage = cache(async (slug: string): Promise<Page | null> => {
  const db = getServerClient();
  if (!db) return null;
  const { data, error } = await db.from("pages").select("*").eq("slug", slug).maybeSingle();
  logError(`page ${slug}`, error);
  return data;
});

export const getPublishedPageSlugs = cache(async (): Promise<{ slug: string; updated_at: string }[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db.from("pages").select("slug, updated_at").eq("show_in_sitemap", true);
  logError("page slugs", error);
  return data ?? [];
});

export const getCourses = cache(async (): Promise<Course[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db.from("courses").select("*").order("sort_order");
  logError("courses", error);
  return data ?? [];
});

export const getCourse = cache(async (slug: string): Promise<Course | null> => {
  const db = getServerClient();
  if (!db) return null;
  const { data, error } = await db.from("courses").select("*").eq("slug", slug).maybeSingle();
  logError(`course ${slug}`, error);
  return data;
});

export const getPostCategories = cache(async (): Promise<PostCategory[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db.from("post_categories").select("*").order("sort_order");
  logError("post categories", error);
  return data ?? [];
});

export const getPosts = cache(async (categorySlug?: string, limit = 24): Promise<Post[]> => {
  const db = getServerClient();
  if (!db) return [];
  // With a filter, an inner join keeps only posts in that category; without one,
  // a left join keeps uncategorised posts too.
  const { data, error } = categorySlug
    ? await db
        .from("posts")
        .select("*, category:post_categories!inner(slug, name)")
        .eq("category.slug", categorySlug)
        .order("published_at", { ascending: false })
        .limit(limit)
    : await db
        .from("posts")
        .select("*, category:post_categories(slug, name)")
        .order("published_at", { ascending: false })
        .limit(limit);
  logError("posts", error);
  return (data as Post[] | null) ?? [];
});

export const getPost = cache(async (slug: string): Promise<Post | null> => {
  const db = getServerClient();
  if (!db) return null;
  const { data, error } = await db
    .from("posts")
    .select("*, category:post_categories(slug, name)")
    .eq("slug", slug)
    .maybeSingle();
  logError(`post ${slug}`, error);
  return data as Post | null;
});

export const getProducts = cache(async (): Promise<Product[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db.from("products").select("*").order("sort_order");
  logError("products", error);
  return data ?? [];
});

export const getTeamMembers = cache(async (kind?: "board" | "team"): Promise<TeamMember[]> => {
  const db = getServerClient();
  if (!db) return [];
  let query = db.from("team_members").select("*").order("sort_order");
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  logError("team members", error);
  return data ?? [];
});

export const getPartners = cache(async (): Promise<Partner[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db.from("partners").select("*").order("sort_order");
  logError("partners", error);
  return data ?? [];
});

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db.from("testimonials").select("*").order("sort_order");
  logError("testimonials", error);
  return data ?? [];
});

export const getActiveAnnouncements = cache(async (): Promise<Announcement[]> => {
  const db = getServerClient();
  if (!db) return [];
  const { data, error } = await db.from("announcements").select("*").order("starts_at", { ascending: false });
  logError("announcements", error);
  return data ?? [];
});

/** Public URL for a file in the public-media storage bucket. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/public-media/${path}` : null;
}

/** Database search (published content only — the database enforces it). */
export async function searchContent(query: string): Promise<import("@/lib/search").SearchResult[]> {
  const db = getServerClient();
  if (!db || !query.trim()) return [];
  const { data, error } = await db.rpc("search_site", { query, max_results: 40 });
  logError(`search "${query}"`, error);
  return (data ?? []).map((r) => ({ ...r, kind: r.kind as import("@/lib/search").SearchKind }));
}
