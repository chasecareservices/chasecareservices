type Row = Record<string, unknown> | null;

const IGNORED = new Set(["updated_at", "created_at", "updated_by", "search_vector"]);

export const TABLE_LABELS: Record<string, string> = {
  pages: "Pages",
  services: "Services",
  posts: "Journal posts",
  courses: "Courses",
  post_categories: "Journal categories",
  product_categories: "Shop categories",
  products: "Shop products",
  team_members: "Team",
  partners: "Partners",
  testimonials: "Testimonials",
  navigation_items: "Menus",
  announcements: "Announcements",
  site_settings: "Site settings",
  media_assets: "Media",
  enquiries: "Enquiries",
  enquiry_notes: "Enquiry notes",
  user_roles: "Staff roles",
  roles: "Roles",
  role_permissions: "Role permissions",
  profiles: "Staff profiles",
  notification_recipients: "Notification emails",
};

const ACTION_LABELS: Record<string, string> = { INSERT: "Created", UPDATE: "Changed", DELETE: "Deleted" };

export const actionLabel = (a: string) => ACTION_LABELS[a.toUpperCase()] ?? a;
export const tableLabel = (t: string) => TABLE_LABELS[t] ?? t.replace(/_/g, " ");

/** Names of the fields that differ between the old and new copies of a row. */
export function changedFields(oldData: Row, newData: Row): string[] {
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  return [...keys]
    .filter((k) => !IGNORED.has(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]))
    .sort();
}

/** A short human name for the record: its title, name, label or slug if it has one. */
export function recordName(oldData: Row, newData: Row, table = ""): string {
  const row = newData ?? oldData ?? {};
  // Enquiries hold members of the public's details: show only the reference.
  const keys = table.startsWith("enquir") ? ["reference"] : ["title", "name", "label", "full_name", "slug", "object_path", "reference"];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.length > 80 ? `${v.slice(0, 77)}…` : v;
  }
  return "";
}
