/**
 * Every content type the dashboard can edit, described once. The list, edit and save
 * screens are generated from these definitions (see app/admin/(panel)/content).
 */

import { RESOURCE_KINDS, SUPPORT_KINDS } from "@/lib/wellbeing";

export type Option = { value: string; label: string };

export type FieldType =
  | "text"
  | "textarea"
  | "slug"
  | "select"
  | "checkbox"
  | "number"
  | "lines" // one item per line → text[]
  | "tags" // comma-separated → text[]
  | "richtext" // simple formatting → content blocks
  | "image" // one photo (path in the public-media bucket)
  | "image-array" // one photo stored as the first item of a text[] column
  | "datetime"
  | "url";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: Option[];
  /** Options loaded from another table: [table, value column, label column]. */
  optionsFrom?: { table: "post_categories" | "product_categories" | "navigation_items"; value: string; label: string; filter?: Record<string, string> };
  /** For slugs: the field the slug is made from when left empty. */
  from?: string;
  max?: number;
  wide?: boolean;
  group?: string;
};

export type Resource = {
  key: string;
  table:
    | "services"
    | "pages"
    | "posts"
    | "courses"
    | "products"
    | "team_members"
    | "partners"
    | "testimonials"
    | "navigation_items"
    | "announcements"
    | "wellbeing_services"
    | "wellbeing_resources";
  /** Permission section, e.g. "content" → content.view / content.edit … */
  section: "content" | "blog" | "academy" | "shop" | "communications" | "wellbeing";
  title: string;
  singular: string;
  intro: string;
  titleField: string;
  columns: { name: string; label: string; options?: Option[] }[];
  order: { column: string; ascending: boolean }[];
  fields: Field[];
  /** Fixed filter for the list (e.g. pages other than the homepage). */
  exclude?: { column: string; value: string };
  /** Where the item appears on the public site. */
  publicUrl?: (row: Record<string, unknown>) => string | null;
};

const STATUS: Option[] = [
  { value: "draft", label: "Draft (hidden)" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived (hidden)" },
];

const WELLBEING_KINDS: Option[] = SUPPORT_KINDS.map((k) => ({ value: k.value, label: k.short }));
const WELLBEING_AUDIENCE: Option[] = [
  { value: "workers", label: "Care workers only" },
  { value: "public", label: "Everyone (public website)" },
];

const SEO: Field[] = [
  { name: "seo_title", label: "Search engine title", type: "text", max: 70, group: "Search engines", hint: "Optional. Shown in Google results." },
  { name: "seo_description", label: "Search engine description", type: "textarea", max: 160, group: "Search engines", hint: "Optional, about 150 characters." },
];

const SERVICE_PATH: Record<string, string> = { care: "/care-services", diaspora: "/diaspora", respite: "/respite", partnership: "/care-services" };

export const RESOURCES: Resource[] = [
  {
    key: "services",
    table: "services",
    section: "content",
    title: "Services",
    singular: "service",
    intro: "Care, diaspora and respite services shown on the website.",
    titleField: "name",
    columns: [
      { name: "name", label: "Service" },
      { name: "service_group", label: "Section", options: [
        { value: "care", label: "Care services" },
        { value: "diaspora", label: "Diaspora" },
        { value: "respite", label: "Respite" },
        { value: "partnership", label: "Partnership" },
      ] },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "service_group", ascending: true }, { column: "sort_order", ascending: true }],
    publicUrl: (r) => `${SERVICE_PATH[String(r.service_group)] ?? "/care-services"}/${r.slug}`,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120 },
      { name: "slug", label: "Web address", type: "slug", from: "name", hint: "Part of the page address, e.g. elderly-care. Leave empty to create it from the name." },
      { name: "service_group", label: "Section", type: "select", required: true, options: [
        { value: "care", label: "Care services" },
        { value: "diaspora", label: "Diaspora services" },
        { value: "respite", label: "Respite & accommodation" },
        { value: "partnership", label: "Partnership" },
      ] },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "summary", label: "Summary", type: "textarea", max: 300, wide: true, hint: "One or two sentences, shown on cards and at the top of the page." },
      { name: "description", label: "Description", type: "textarea", max: 5000, wide: true, hint: "Blank lines separate paragraphs." },
      { name: "includes", label: "What's included", type: "lines", wide: true, hint: "One item per line." },
      { name: "audience", label: "Who it's for", type: "textarea", max: 500, wide: true },
      { name: "image_path", label: "Photo", type: "image", hint: "Landscape photo, at least 1600 px wide." },
      { name: "cta_label", label: "Button text", type: "text", max: 40, hint: "e.g. Request this service" },
      { name: "sort_order", label: "Order", type: "number", hint: "Lower numbers come first." },
      ...SEO,
    ],
  },
  {
    key: "pages",
    table: "pages",
    section: "content",
    title: "Pages",
    singular: "page",
    intro: "Information pages such as Wellbeing, Join Our Team and Community. A published page here replaces the built-in text.",
    titleField: "title",
    columns: [
      { name: "title", label: "Page" },
      { name: "slug", label: "Address" },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "slug", ascending: true }],
    exclude: { column: "slug", value: "home" },
    publicUrl: (r) => `/${r.slug}`,
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      { name: "slug", label: "Web address", type: "slug", from: "title", hint: "e.g. wellbeing or community/monthly-forum" },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "summary", label: "Introduction", type: "textarea", max: 400, wide: true, hint: "Shown in the banner at the top of the page." },
      { name: "body", label: "Page content", type: "richtext", wide: true },
      { name: "show_in_sitemap", label: "List in search engines' sitemap", type: "checkbox" },
      ...SEO,
    ],
  },
  {
    key: "posts",
    table: "posts",
    section: "blog",
    title: "The Journal",
    singular: "article",
    intro: "Articles for the ChaseCare Journal. Set a future publish date to schedule an article.",
    titleField: "title",
    columns: [
      { name: "title", label: "Article" },
      { name: "published_at", label: "Publish date" },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "published_at", ascending: false }],
    publicUrl: (r) => `/journal/${r.slug}`,
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      { name: "slug", label: "Web address", type: "slug", from: "title" },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "published_at", label: "Publish date and time", type: "datetime", hint: "Leave empty to publish now. A future date schedules it." },
      { name: "category_id", label: "Category", type: "select", optionsFrom: { table: "post_categories", value: "id", label: "name" } },
      { name: "author_name", label: "Author name", type: "text", max: 120 },
      { name: "excerpt", label: "Short summary", type: "textarea", max: 300, wide: true },
      { name: "body", label: "Article", type: "richtext", wide: true },
      { name: "cover_image_path", label: "Cover photo", type: "image" },
      { name: "tags", label: "Tags", type: "tags", hint: "Separate with commas." },
      ...SEO,
    ],
  },
  {
    key: "courses",
    table: "courses",
    section: "academy",
    title: "Courses",
    singular: "course",
    intro: "ChaseCare Academy courses. Only mark a course as externally accredited once the accreditation has been obtained.",
    titleField: "title",
    columns: [
      { name: "title", label: "Course" },
      { name: "certification_type", label: "Certificate", options: [
        { value: "internal", label: "Chase certificate" },
        { value: "cpd", label: "CPD" },
        { value: "externally_accredited", label: "Externally accredited" },
      ] },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "sort_order", ascending: true }],
    publicUrl: (r) => `/academy/${r.slug}`,
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      { name: "slug", label: "Web address", type: "slug", from: "title" },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "category", label: "Category", type: "text", max: 80 },
      { name: "audience", label: "Audience", type: "select", required: true, options: [
        { value: "caregivers", label: "Caregivers" },
        { value: "professionals", label: "Healthcare professionals" },
        { value: "parents", label: "Parents & families" },
        { value: "students", label: "Students / young people" },
        { value: "general", label: "Everyone" },
      ] },
      { name: "is_signature", label: "Signature course", type: "checkbox" },
      { name: "summary", label: "Summary", type: "textarea", max: 400, wide: true },
      { name: "description", label: "Course description", type: "richtext", wide: true },
      { name: "learning_outcomes", label: "What you will learn", type: "lines", wide: true, hint: "One item per line." },
      { name: "duration_text", label: "Duration", type: "text", max: 80, hint: "e.g. 2 days" },
      { name: "delivery_mode", label: "Delivery", type: "select", required: true, options: [
        { value: "in_person", label: "In person" },
        { value: "online", label: "Online" },
        { value: "blended", label: "Blended" },
      ] },
      { name: "fee_amount", label: "Fee", type: "number", hint: "Leave empty to show 'Contact us'." },
      { name: "fee_currency", label: "Currency", type: "text", max: 3, hint: "e.g. GHS" },
      { name: "certification_type", label: "Certificate", type: "select", required: true, group: "Certificate", options: [
        { value: "internal", label: "Chase certificate" },
        { value: "cpd", label: "CPD course" },
        { value: "externally_accredited", label: "Externally accredited" },
      ] },
      { name: "accrediting_body", label: "Accrediting body", type: "text", max: 200, group: "Certificate", hint: "Required for externally accredited courses." },
      { name: "accreditation_reference", label: "Accreditation reference", type: "text", max: 120, group: "Certificate", hint: "Required for externally accredited courses." },
      { name: "image_path", label: "Photo", type: "image" },
      { name: "sort_order", label: "Order", type: "number" },
      ...SEO,
    ],
  },
  {
    key: "products",
    table: "products",
    section: "shop",
    title: "Shop products",
    singular: "product",
    intro: "Items shown in the ChaseCare Shop.",
    titleField: "name",
    columns: [
      { name: "name", label: "Product" },
      { name: "price_amount", label: "Price" },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "sort_order", ascending: true }],
    publicUrl: () => "/shop",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120 },
      { name: "slug", label: "Web address", type: "slug", from: "name" },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "category_id", label: "Category", type: "select", optionsFrom: { table: "product_categories", value: "id", label: "name" } },
      { name: "description", label: "Description", type: "textarea", max: 1000, wide: true },
      { name: "price_amount", label: "Price", type: "number", hint: "Leave empty to show 'Price on request'." },
      { name: "price_currency", label: "Currency", type: "text", max: 3 },
      { name: "stock_quantity", label: "Stock", type: "number", hint: "Leave empty if you don't track stock." },
      { name: "is_available", label: "Available to order", type: "checkbox" },
      { name: "image_paths", label: "Photo", type: "image-array" },
      { name: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    key: "team",
    table: "team_members",
    section: "content",
    title: "Team & board",
    singular: "person",
    intro: "People shown on the About page under leadership and team. Publish only with each person's permission.",
    titleField: "full_name",
    columns: [
      { name: "full_name", label: "Name" },
      { name: "kind", label: "Group", options: [
        { value: "board", label: "Board / leadership" },
        { value: "team", label: "Team" },
      ] },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "kind", ascending: true }, { column: "sort_order", ascending: true }],
    publicUrl: () => "/about#board",
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true, max: 120 },
      { name: "position", label: "Position", type: "text", max: 120 },
      { name: "kind", label: "Group", type: "select", required: true, options: [
        { value: "board", label: "Board / leadership" },
        { value: "team", label: "Team" },
      ] },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "bio", label: "Short biography", type: "textarea", max: 1200, wide: true },
      { name: "background", label: "Professional background", type: "textarea", max: 1200, wide: true },
      { name: "experience", label: "Relevant experience", type: "textarea", max: 1200, wide: true },
      { name: "photo_path", label: "Photo", type: "image", hint: "Square head-and-shoulders photo works best." },
      { name: "photo_crop", label: "Photo framing", type: "select", required: true, options: [
        { value: "close", label: "Close-up: head and shoulders (use as it is)" },
        { value: "upper", label: "Half-length: zoom a little on the face" },
        { value: "full", label: "Full-length: zoom in on the face" },
      ], hint: "The About page shows photos in a small circle. If only clothes show, choose a zoom." },
      { name: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    key: "partners",
    table: "partners",
    section: "content",
    title: "Partners",
    singular: "partner",
    intro: "Partner organisations. A partner can only be published once permission to display them is recorded.",
    titleField: "name",
    columns: [
      { name: "name", label: "Partner" },
      { name: "partner_type", label: "Type" },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "sort_order", ascending: true }],
    publicUrl: () => "/about#partners",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 200 },
      { name: "partner_type", label: "Type", type: "select", required: true, options: [
        { value: "healthcare", label: "Healthcare" },
        { value: "laboratory", label: "Laboratory" },
        { value: "insurance", label: "Insurance" },
        { value: "school", label: "School" },
        { value: "hospital", label: "Hospital" },
        { value: "community", label: "Community organisation" },
        { value: "therapist", label: "Therapist" },
        { value: "training_accreditation", label: "Training / accreditation" },
        { value: "corporate", label: "Corporate" },
      ] },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "display_permission", label: "We have permission to show this partner and their logo", type: "checkbox" },
      { name: "display_permission_note", label: "Permission note", type: "text", max: 300, hint: "Who gave permission, and when." },
      { name: "website_url", label: "Website", type: "url" },
      { name: "description", label: "Description", type: "textarea", max: 600, wide: true },
      { name: "logo_path", label: "Logo", type: "image" },
      { name: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    key: "testimonials",
    table: "testimonials",
    section: "content",
    title: "Testimonials",
    singular: "testimonial",
    intro: "Quotes from families and clients. A testimonial can only be published once consent is recorded.",
    titleField: "author_name",
    columns: [
      { name: "author_name", label: "From" },
      { name: "consent_obtained", label: "Consent" },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "sort_order", ascending: true }],
    publicUrl: () => "/",
    fields: [
      { name: "author_name", label: "Name shown", type: "text", required: true, max: 120, hint: "e.g. Ama K." },
      { name: "author_context", label: "Description", type: "text", max: 160, hint: "e.g. Daughter of a client, London" },
      { name: "quote", label: "Quote", type: "textarea", required: true, max: 1000, wide: true },
      { name: "consent_obtained", label: "Written consent obtained to publish this", type: "checkbox" },
      { name: "consent_notes", label: "Consent note", type: "text", max: 300, hint: "How and when consent was given." },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    key: "menus",
    table: "navigation_items",
    section: "content",
    title: "Menus",
    singular: "menu link",
    intro: "Links in the main menu, its drop-downs, the footer and call-to-action buttons.",
    titleField: "label",
    columns: [
      { name: "label", label: "Link" },
      { name: "menu", label: "Menu", options: [
        { value: "main", label: "Main menu" },
        { value: "footer", label: "Footer" },
        { value: "cta", label: "Buttons" },
      ] },
      { name: "href", label: "Goes to" },
    ],
    order: [{ column: "menu", ascending: false }, { column: "sort_order", ascending: true }],
    fields: [
      { name: "label", label: "Link text", type: "text", required: true, max: 60 },
      { name: "href", label: "Goes to", type: "text", required: true, max: 300, hint: "A page on this site, e.g. /care-services, or a full web address." },
      { name: "menu", label: "Menu", type: "select", required: true, options: [
        { value: "main", label: "Main menu" },
        { value: "footer", label: "Footer" },
        { value: "cta", label: "Buttons" },
      ] },
      { name: "parent_id", label: "Drop-down under", type: "select", hint: "Leave empty for a top-level link.", optionsFrom: { table: "navigation_items", value: "id", label: "label", filter: { menu: "main" } } },
      { name: "sort_order", label: "Order", type: "number" },
      { name: "is_visible", label: "Show this link", type: "checkbox" },
    ],
  },
  {
    key: "announcements",
    table: "announcements",
    section: "communications",
    title: "Website notice bar",
    singular: "notice",
    intro: "A short message bar across the top of the public website, between the dates you choose. For messages to care workers and families, use Communications → Announcements.",
    titleField: "message",
    columns: [
      { name: "message", label: "Message" },
      { name: "starts_at", label: "From" },
      { name: "ends_at", label: "Until" },
    ],
    order: [{ column: "starts_at", ascending: false }],
    publicUrl: () => "/",
    fields: [
      { name: "message", label: "Message", type: "text", required: true, max: 200, wide: true },
      { name: "link_url", label: "Link (optional)", type: "text", max: 300 },
      { name: "audience", label: "Shown to", type: "select", required: true, options: [{ value: "public", label: "Website visitors" }] },
      { name: "starts_at", label: "Show from", type: "datetime", hint: "Leave empty to start now." },
      { name: "ends_at", label: "Show until", type: "datetime", hint: "Leave empty to keep showing." },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
  },
  {
    key: "wellbeing-services",
    table: "wellbeing_services",
    section: "wellbeing",
    title: "Wellbeing services",
    singular: "wellbeing service",
    intro: "Counselling, health, laboratory and insurance support for care workers. Choose who can see each one: everyone, or care workers only (in their portal).",
    titleField: "name",
    columns: [
      { name: "name", label: "Service" },
      { name: "kind", label: "Type", options: WELLBEING_KINDS },
      { name: "audience", label: "Who sees it", options: WELLBEING_AUDIENCE },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "sort_order", ascending: true }, { column: "name", ascending: true }],
    publicUrl: (r) => (r.audience === "public" ? "/wellbeing#services" : null),
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 200 },
      { name: "kind", label: "Type", type: "select", required: true, options: WELLBEING_KINDS },
      { name: "audience", label: "Who sees it", type: "select", required: true, options: WELLBEING_AUDIENCE },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "provider", label: "Provided by", type: "text", max: 200, hint: "e.g. the partner clinic's name. Only name a partner once they have agreed." },
      { name: "benefit", label: "Benefit for our workers", type: "text", max: 300, hint: "Optional, e.g. Free for ChaseCare care workers" },
      { name: "description", label: "Description", type: "textarea", max: 3000, wide: true },
      { name: "how_to_access", label: "How to get it", type: "textarea", max: 1000, wide: true, hint: "e.g. Ask through the Wellbeing Hub in your portal." },
      { name: "location", label: "Where", type: "text", max: 200 },
      { name: "phone", label: "Phone", type: "text", max: 40 },
      { name: "website_url", label: "Website", type: "url" },
      { name: "sort_order", label: "Order", type: "number", hint: "Lower numbers come first." },
    ],
  },
  {
    key: "wellbeing-resources",
    table: "wellbeing_resources",
    section: "wellbeing",
    title: "Wellbeing resources & webinars",
    singular: "resource",
    intro: "Health education, articles, videos, webinars and support sessions. Webinars and sessions with a date show as “coming up” until they have passed.",
    titleField: "title",
    columns: [
      { name: "title", label: "Title" },
      { name: "kind", label: "Type", options: [...RESOURCE_KINDS] },
      { name: "starts_at", label: "Date" },
      { name: "audience", label: "Who sees it", options: WELLBEING_AUDIENCE },
      { name: "status", label: "Status", options: STATUS },
    ],
    order: [{ column: "starts_at", ascending: false }, { column: "sort_order", ascending: true }],
    publicUrl: (r) => (r.audience === "public" ? "/wellbeing#resources" : null),
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      { name: "kind", label: "Type", type: "select", required: true, options: [...RESOURCE_KINDS] },
      { name: "audience", label: "Who sees it", type: "select", required: true, options: WELLBEING_AUDIENCE },
      { name: "status", label: "Status", type: "select", required: true, options: STATUS },
      { name: "summary", label: "Summary", type: "textarea", max: 600, wide: true },
      { name: "url", label: "Link", type: "url", hint: "The article, video, or the webinar joining link." },
      { name: "starts_at", label: "Date and time (webinars and sessions)", type: "datetime", hint: "Ghana time. Leave empty for articles and videos." },
      { name: "place", label: "Where", type: "text", max: 200, hint: "e.g. Online (Zoom) or Chase Care office, Accra" },
      { name: "sort_order", label: "Order", type: "number" },
    ],
  },
];

export function getResource(key: string) {
  return RESOURCES.find((r) => r.key === key);
}

/** "Elderly Care & Support!" → "elderly-care-support" */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/-*\/-*/g, "/")
    .replace(/^[-/]+|[-/]+$/g, "")
    .slice(0, 80);
}

/** Default values for a new item. */
export const NEW_DEFAULTS: Record<string, Record<string, unknown>> = {
  services: { service_group: "care", status: "draft", sort_order: 100, cta_label: "Request this service" },
  pages: { status: "draft", show_in_sitemap: true },
  posts: { status: "draft" },
  courses: { status: "draft", audience: "caregivers", delivery_mode: "in_person", certification_type: "internal", fee_currency: "GHS", sort_order: 100 },
  products: { status: "draft", price_currency: "GHS", is_available: true, sort_order: 100 },
  team: { kind: "board", status: "draft", sort_order: 100, photo_crop: "close" },
  partners: { status: "draft", partner_type: "healthcare", sort_order: 100 },
  testimonials: { status: "draft", sort_order: 100 },
  menus: { menu: "main", is_visible: true, sort_order: 100 },
  announcements: { audience: "public", is_active: true },
};
