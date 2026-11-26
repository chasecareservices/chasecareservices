/* eslint-disable @next/next/no-img-element -- previews of uploaded photos */
import type { Field, Option, Resource } from "@/lib/admin/resources";
import { blocksToText } from "@/lib/admin/richtext";
import { fieldValue } from "@/lib/admin/values";
import { mediaUrl } from "@/lib/content";
import { adminInput } from "@/components/admin/ui";

function FieldInput({ field, value, options }: { field: Field; value: unknown; options?: Option[] }) {
  const v = fieldValue(field, value);
  const common = { id: field.name, name: field.name, required: field.required, className: adminInput };
  switch (field.type) {
    case "textarea":
      return <textarea {...common} defaultValue={v} rows={field.max && field.max > 600 ? 6 : 3} maxLength={field.max} />;
    case "lines":
      return <textarea {...common} defaultValue={v} rows={6} />;
    case "richtext": {
      const { preserved } = blocksToText(value);
      return (
        <>
          <textarea {...common} defaultValue={v} rows={16} className={`${adminInput} font-mono text-[0.8125rem] leading-relaxed`} />
          <input type="hidden" name={`${field.name}__preserved`} value={JSON.stringify(preserved)} />
          <span className="mt-1 block text-xs font-normal text-muted">
            Formatting: leave a blank line between paragraphs · start a line with <code>## </code> for a heading · start lines with{" "}
            <code>- </code> for bullet points.
            {preserved.length > 0 && ` This page also has ${preserved.length} special section(s) that are kept as they are.`}
          </span>
        </>
      );
    }
    case "select":
      return (
        <select {...common} defaultValue={v}>
          {!field.required && <option value="">—</option>}
          {(options ?? field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <input
          id={field.name}
          name={field.name}
          type="checkbox"
          defaultChecked={value === true}
          className="mr-2 h-5 w-5 align-middle accent-brand-800"
        />
      );
    case "number":
      return <input {...common} type="number" min={0} step="any" defaultValue={v} />;
    case "datetime":
      return <input {...common} type="datetime-local" defaultValue={v} />;
    case "url":
      return <input {...common} type="url" defaultValue={v} placeholder="https://" />;
    case "image":
    case "image-array": {
      const path = field.type === "image-array" ? (Array.isArray(value) ? (value[0] as string | undefined) : undefined) : (value as string | null);
      const src = mediaUrl(path);
      return (
        <div className="mt-1 space-y-2">
          {src ? (
            <img src={src} alt="" className="h-32 w-auto max-w-full rounded-lg object-cover ring-1 ring-gray-200" />
          ) : (
            <p className="text-sm text-muted">No photo yet.</p>
          )}
          <input id={field.name} name={field.name} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="block text-sm" />
          {src && (
            <label className="flex items-center gap-2 text-sm font-normal">
              <input type="checkbox" name={`${field.name}__remove`} className="h-4 w-4 accent-brand-800" /> Remove this photo
            </label>
          )}
        </div>
      );
    }
    default:
      return <input {...common} type="text" defaultValue={v} maxLength={field.max} />;
  }
}

/** All the inputs for one content item, grouped as in the resource definition. */
export function ResourceFields({
  resource,
  row,
  optionSets,
}: {
  resource: Resource;
  row: Record<string, unknown>;
  optionSets: Record<string, Option[]>;
}) {
  const groups = new Map<string, Field[]>();
  for (const f of resource.fields) {
    const g = f.group ?? "Details";
    groups.set(g, [...(groups.get(g) ?? []), f]);
  }
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, fields]) => (
        <section key={group} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-brand-900">{group}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={f.wide || f.type === "richtext" ? "md:col-span-2" : ""}>
                {f.type === "checkbox" ? (
                  <label htmlFor={f.name} className="flex items-center text-sm font-medium text-brand-900">
                    <FieldInput field={f} value={row[f.name]} />
                    {f.label}
                  </label>
                ) : (
                  <label htmlFor={f.name} className="block text-sm font-medium text-brand-900">
                    {f.label}
                    {f.required && <span className="text-accent-700"> *</span>}
                  </label>
                )}
                {f.type !== "checkbox" && <FieldInput field={f} value={row[f.name]} options={optionSets[f.name]} />}
                {f.hint && f.type !== "richtext" && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
