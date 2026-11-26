"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { SOCIAL_NETWORKS } from "./fields";

const text = (f: FormData, k: string, max = 300) => {
  const v = String(f.get(k) ?? "").trim();
  return v ? v.slice(0, max) : null;
};

/** Rows like hours_days_0 / hours_hours_0 … → [{ days, hours }], skipping empty rows. */
function rows<K extends string>(f: FormData, prefix: string, keys: K[], count: number, required: K[]) {
  const out: Record<K, string>[] = [];
  for (let i = 0; i < count; i++) {
    const row = Object.fromEntries(keys.map((k) => [k, (text(f, `${prefix}_${k}_${i}`, 200) ?? "")])) as Record<K, string>;
    if (required.every((k) => row[k])) {
      out.push(Object.fromEntries(Object.entries(row).filter(([, v]) => v)) as Record<K, string>);
    }
  }
  return out;
}

function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function saveSettings(formData: FormData) {
  const staff = await requirePermission("settings.edit");

  const email = text(formData, "email", 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/admin/settings?error=email");

  const social: Record<string, string> = {};
  for (const network of SOCIAL_NETWORKS) {
    const url = safeUrl(text(formData, `social_${network.key}`, 300));
    if (url) social[network.key] = url;
  }

  const { error } = await staff.supabase
    .from("site_settings")
    .update({
      organisation_name: text(formData, "organisation_name", 120) ?? "Chase Care Services",
      tagline: text(formData, "tagline", 200) ?? "Quality Care. Compassionate Support. Empowered Lives.",
      supporting_statement: text(formData, "supporting_statement", 500),
      phone: text(formData, "phone", 40),
      whatsapp_number: text(formData, "whatsapp_number", 40),
      email,
      address: text(formData, "address", 300),
      map_url: safeUrl(text(formData, "map_url", 500)),
      opening_hours: rows(formData, "hours", ["days", "hours"], 4, ["days", "hours"]),
      social_links: social,
      impact_stats: rows(formData, "impact", ["value", "label", "detail"], 4, ["value", "label"]),
      recognitions: rows(formData, "recognition", ["name", "year", "detail"], 6, ["name"]),
      updated_by: staff.user.id,
    })
    .eq("id", true);

  // Refresh every public page so the new details show straight away.
  revalidatePath("/", "layout");
  redirect(`/admin/settings?${error ? "error=save" : "saved=1"}`);
}
