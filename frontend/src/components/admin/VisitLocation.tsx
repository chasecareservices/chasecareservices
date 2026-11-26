import { ActionForm } from "@/components/admin/ActionForm";
import { formatDateTime } from "@/components/admin/ui";
import { formatDistance, mapsEmbed, mapsLink, visitVerdict } from "@/lib/care";

type Report = {
  id: string;
  submitted_at: string;
  location_status: string;
  location_lat: number | null;
  location_lng: number | null;
  location_accuracy_m: number | null;
  location_captured_at: string | null;
};

/** One-line summary for lists: text plus a symbol, never colour alone. */
export function LocationTag({ report, home }: { report: Omit<Report, "id" | "submitted_at" | "location_captured_at">; home: { lat: number | null; lng: number | null } }) {
  const v = visitVerdict({ status: report.location_status, lat: report.location_lat, lng: report.location_lng, accuracy: report.location_accuracy_m }, home);
  if (report.location_status === "not_recorded") return null;
  const style =
    v.kind === "at_home" ? "bg-green-100 text-green-800" : v.kind === "away" || v.kind === "no_location" ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-700";
  const text =
    v.kind === "at_home" ? "📍 At the home" : v.kind === "away" ? `⚠ ${formatDistance(v.distance)} from home` : v.kind === "no_location" ? "⚠ No location" : "📍 Location recorded";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{text}</span>;
}

/**
 * Where the care worker's phone was when they wrote the report, on a Google Map,
 * compared with the client's home.
 */
export function VisitLocationPanel({
  report,
  client,
  canSetHome,
  setHomeAction,
}: {
  report: Report;
  client: { name: string; home_lat: number | null; home_lng: number | null };
  canSetHome: boolean;
  setHomeAction: (formData: FormData) => Promise<{ error: string } | undefined>;
}) {
  if (report.location_status === "not_recorded") {
    return <p className="text-sm text-muted">This report was sent before visit locations were recorded.</p>;
  }
  const v = visitVerdict(
    { status: report.location_status, lat: report.location_lat, lng: report.location_lng, accuracy: report.location_accuracy_m },
    { lat: client.home_lat, lng: client.home_lng },
  );

  if (v.kind === "no_location") {
    return (
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950">
        <p className="font-bold">
          <span aria-hidden="true">⚠ </span>No location with this report
        </p>
        <p className="mt-1">The care worker&apos;s phone said: “{v.reason}”. You may want to confirm the visit with the client or family.</p>
      </div>
    );
  }

  const lat = report.location_lat!;
  const lng = report.location_lng!;
  const minutesBeforeSending = Math.round((new Date(report.submitted_at).getTime() - new Date(report.location_captured_at!).getTime()) / 60000);

  return (
    <div className="space-y-3">
      {v.kind === "at_home" && (
        <p className="rounded-xl border-2 border-green-300 bg-green-50 px-4 py-3 font-bold text-green-900">
          <span aria-hidden="true">✓ </span>At {client.name}&apos;s home <span className="font-normal">(about {formatDistance(v.distance)} away)</span>
        </p>
      )}
      {v.kind === "away" && (
        <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 font-bold text-amber-950">
          <span aria-hidden="true">⚠ </span>About {formatDistance(v.distance)} from {client.name}&apos;s home
          <span className="block text-sm font-normal">
            The report may have been written after leaving, or the visit was somewhere else (e.g. an appointment). Check with the care worker.
          </span>
        </p>
      )}
      {v.kind === "no_home" && (
        <div className="rounded-xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-brand-900">
          <p className="font-bold">{client.name}&apos;s home location isn&apos;t set yet, so we can&apos;t compare.</p>
          {canSetHome && (
            <ActionForm action={setHomeAction} submitLabel={`Use this location as ${client.name}'s home`} inline>
              <input type="hidden" name="report_id" value={report.id} />
              <p className="text-sm">Only do this if you know the visit took place at their home.</p>
            </ActionForm>
          )}
        </div>
      )}

      <iframe
        title={`Map showing where the care worker was when writing this report`}
        src={mapsEmbed(lat, lng)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-64 w-full rounded-xl border-0 ring-1 ring-gray-200"
      />
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <dt className="text-muted">Recorded at</dt>
        <dd>
          {formatDateTime(report.location_captured_at)}
          {minutesBeforeSending > 1 ? ` (${minutesBeforeSending} min before sending)` : ""}
        </dd>
        <dt className="text-muted">Accuracy</dt>
        <dd>{report.location_accuracy_m != null ? `about ${Math.round(report.location_accuracy_m)} m` : "not given"}</dd>
      </dl>
      <a href={mapsLink(lat, lng)} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-brand-700 underline underline-offset-4">
        Open in Google Maps ↗
      </a>
      <p className="text-xs text-muted">
        Phone locations are good evidence but not proof: accuracy varies indoors, and locations can be faked. Use it alongside the report and
        what families tell you.
      </p>
    </div>
  );
}
