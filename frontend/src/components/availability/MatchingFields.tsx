import { adminInput } from "@/components/admin/ui";
import { LANGUAGES, SKILLS } from "@/lib/matching";

const chip = "flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50";

export function SkillChecks({ name, selected, legend }: { name: string; selected: string[]; legend: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-brand-900">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {SKILLS.map((s) => (
          <label key={s.value} className={chip}>
            <input type="checkbox" name={name} value={s.value} defaultChecked={selected.includes(s.value)} className="h-4 w-4 accent-brand-800" />
            {s.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LanguageChecks({ selected, legend }: { selected: string[]; legend: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-brand-900">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {LANGUAGES.map((l) => (
          <label key={l} className={chip}>
            <input type="checkbox" name="languages" value={l} defaultChecked={selected.includes(l)} className="h-4 w-4 accent-brand-800" />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function GenderSelect({ name, value, label, emptyLabel }: { name: string; value: string | null; label: string; emptyLabel: string }) {
  return (
    <label className="block text-sm font-medium text-brand-900">
      {label}
      <select name={name} defaultValue={value ?? ""} className={adminInput}>
        <option value="">{emptyLabel}</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
      </select>
    </label>
  );
}
