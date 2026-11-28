import { WEEKDAYS } from "@/lib/matching";

type Row = { weekday: number; start_time: string; end_time: string };

/** Tick the days you can work and give the hours. Used in the worker portal and the dashboard. */
export function AvailabilityFields({ rows, compact = false }: { rows: Row[]; compact?: boolean }) {
  const input = "min-h-11 rounded-lg border border-brand-200 bg-white px-2 text-base";
  return (
    <fieldset>
      <legend className="sr-only">Days and hours you can usually work</legend>
      <ul className="space-y-2">
        {WEEKDAYS.map((name, i) => {
          const d = i + 1;
          const r = rows.find((x) => x.weekday === d);
          return (
            <li key={d} className={`flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-white px-3 py-2 has-[:checked]:border-brand-400 ${compact ? "text-sm" : ""}`}>
              <label className="flex min-w-36 items-center gap-3 font-semibold text-brand-900">
                <input type="checkbox" name={`day_${d}`} defaultChecked={!!r} className="h-5 w-5 accent-brand-800" />
                {name}
              </label>
              <span className="flex items-center gap-2 text-sm">
                <label htmlFor={`from_${d}`} className="sr-only">
                  {name} from
                </label>
                <input id={`from_${d}`} name={`from_${d}`} type="time" defaultValue={r?.start_time.slice(0, 5) ?? "08:00"} className={input} />
                <span aria-hidden="true">to</span>
                <label htmlFor={`to_${d}`} className="sr-only">
                  {name} until
                </label>
                <input id={`to_${d}`} name={`to_${d}`} type="time" defaultValue={r?.end_time.slice(0, 5) ?? "16:00"} className={input} />
              </span>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
