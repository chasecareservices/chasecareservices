import type { MetadataRoute } from "next";
import { SERVICE_GROUP_PATH } from "@/components/services";
import { getCourses, getPosts, getPublishedPageSlugs, getServices } from "@/lib/content";
import { PAGE_COPY } from "@/lib/site-copy";

export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/about",
  "/care-services",
  "/diaspora",
  "/respite",
  "/academy",
  "/journal",
  "/shop",
  "/contact",
  "/register/client",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [services, courses, posts, pages] = await Promise.all([
    getServices(),
    getCourses(),
    getPosts(undefined, 500),
    getPublishedPageSlugs(),
  ]);
  const skip = new Set(["home", "about", "contact", "diaspora", "respite"]);
  const cmsPaths = new Set([...Object.keys(PAGE_COPY), ...pages.map((p) => p.slug)].filter((s) => !skip.has(s) && !s.startsWith("about/")));

  return [
    ...STATIC_PATHS.map((p) => ({ url: `${base}${p}` })),
    ...[...cmsPaths].map((s) => ({ url: `${base}/${s}` })),
    ...services.map((s) => ({ url: `${base}${SERVICE_GROUP_PATH[s.service_group]}/${s.slug}`, lastModified: s.updated_at })),
    ...courses.map((c) => ({ url: `${base}/academy/${c.slug}`, lastModified: c.updated_at })),
    ...posts.map((p) => ({ url: `${base}/journal/${p.slug}`, lastModified: p.updated_at })),
  ];
}
