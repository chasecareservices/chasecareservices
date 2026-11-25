import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Option, Resource } from "@/lib/admin/resources";

/** Loads the choices for select fields that come from another table. */
export async function loadOptionSets(supabase: SupabaseClient<Database>, resource: Resource, currentId?: string) {
  const sets: Record<string, Option[]> = {};
  for (const f of resource.fields) {
    if (!f.optionsFrom) continue;
    const { table, value, label, filter } = f.optionsFrom;
    let q = supabase.from(table).select(`${value}, ${label}`).order(label);
    if (table === "navigation_items") q = q.is("parent_id", null);
    for (const [col, v] of Object.entries(filter ?? {})) q = q.eq(col, v);
    const { data } = await q;
    sets[f.name] = ((data ?? []) as unknown as Record<string, string>[])
      .filter((r) => r[value] !== currentId)
      .map((r) => ({ value: String(r[value]), label: String(r[label]) }));
  }
  return sets;
}
