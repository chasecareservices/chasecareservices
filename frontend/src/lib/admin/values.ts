import { blocksToText, textToBlocks, type Block } from "@/lib/admin/richtext";
import { slugify, type Field, type Resource } from "@/lib/admin/resources";

/** A database error turned into a message staff can act on. */
export function friendlyDbError(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null;
  const m = error.message ?? "";
  if (error.code === "23505") return "That web address is already used by another item. Please choose a different one.";
  if (m.includes("partners_publish_needs_permission")) return "A partner can only be published once you've ticked that you have permission to show them.";
  if (m.includes("testimonials_publish_needs_consent")) return "A testimonial can only be published once you've ticked that written consent was obtained.";
  if (m.includes("courses_accreditation_recorded")) return "An externally accredited course needs both the accrediting body and the accreditation reference.";
  if (m.includes("posts_published_needs_date")) return "A published article needs a publish date.";
  if (error.code === "42501" || /row-level security/i.test(m)) return "You don't have permission to make that change.";
  if (error.code === "23514") return "One of the values isn't allowed. Please check the form.";
  if (error.code === "22P02" || error.code === "22007") return "One of the values is in the wrong format. Please check numbers and dates.";
  return "The changes could not be saved. Please try again.";
}

const str = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
};

/** datetime-local value (Ghana time = UTC) → ISO string, or null. */
export function toIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([zZ]|[+-]\d\d:\d\d)?$/.test(value)) return null;
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string → value for a datetime-local input (Ghana time = UTC). */
export function toLocalInput(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}

/** Reads the non-image fields of a resource form into database values. */
export function readFields(resource: Resource, form: FormData): { values: Record<string, unknown>; error?: string } {
  const values: Record<string, unknown> = {};
  for (const f of resource.fields) {
    if (f.type === "image" || f.type === "image-array") continue;
    const raw = str(form, f.name);
    switch (f.type) {
      case "checkbox":
        values[f.name] = form.get(f.name) === "on";
        break;
      case "number": {
        if (!raw) {
          values[f.name] = f.name === "sort_order" ? 100 : null;
          break;
        }
        const n = Number(raw.replace(/,/g, ""));
        if (!Number.isFinite(n) || n < 0) return { values, error: `${f.label} must be a number of 0 or more.` };
        values[f.name] = n;
        break;
      }
      case "lines":
        values[f.name] = raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 50);
        break;
      case "tags":
        values[f.name] = raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
        break;
      case "richtext": {
        let preserved: Block[] = [];
        try {
          preserved = JSON.parse(str(form, `${f.name}__preserved`) || "[]") as Block[];
        } catch {
          preserved = [];
        }
        values[f.name] = textToBlocks(raw.slice(0, 50000), Array.isArray(preserved) ? preserved : []);
        break;
      }
      case "datetime":
        values[f.name] = toIso(raw);
        if (raw && values[f.name] === null) return { values, error: `${f.label} isn't a valid date and time.` };
        break;
      case "url":
        if (raw && !/^https?:\/\//i.test(raw)) return { values, error: `${f.label} must start with https://` };
        values[f.name] = raw || null;
        break;
      case "slug":
        values[f.name] = slugify(raw || str(form, f.from ?? "")) || null;
        if (!values[f.name]) return { values, error: `${f.label} is needed.` };
        break;
      case "select":
        values[f.name] = raw || null;
        break;
      default:
        values[f.name] = f.max ? raw.slice(0, f.max) || null : raw || null;
    }
    if (f.required && (values[f.name] === null || values[f.name] === "")) return { values, error: `${f.label} is required.` };
  }
  return { values };
}

/** Database value → what the form field shows. */
export function fieldValue(field: Field, value: unknown): string {
  if (value === null || value === undefined) return "";
  switch (field.type) {
    case "lines":
      return Array.isArray(value) ? value.join("\n") : "";
    case "tags":
      return Array.isArray(value) ? value.join(", ") : "";
    case "richtext":
      return blocksToText(value).text;
    case "datetime":
      return toLocalInput(value);
    default:
      return String(value);
  }
}
