"use client";

import { useState } from "react";
import { LOCATION_PROBLEMS, mapsLink, type VisitLocation } from "@/lib/care";

type Phase = "idle" | "locating";

/**
 * Records the phone's location once, when the care worker asks. Explains why first,
 * shows how accurate the reading is, and says exactly what to do if it fails.
 * The worker can always send without a location; the office then sees why.
 */
export function LocationCapture({
  value,
  onChange,
  error,
}: {
  value: VisitLocation | null | undefined;
  onChange: (loc: VisitLocation | null) => void;
  error?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<Exclude<VisitLocation["status"], "captured"> | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setProblem("not_supported");
      return;
    }
    setPhase("locating");
    setProblem(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPhase("idle");
        onChange({
          status: "captured",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          captured_at: new Date(pos.timestamp || Date.now()).toISOString(),
        });
      },
      (err) => {
        setPhase("idle");
        setProblem(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  const captured = value?.status === "captured" ? value : null;
  const without = value && value.status !== "captured" ? value : null;
  const weak = captured && (captured.accuracy ?? 0) > 100;

  return (
    <section
      data-field="location"
      aria-labelledby="location-h"
      aria-describedby={error ? "location-error" : undefined}
      className={`rounded-2xl border-2 bg-white p-4 ${error ? "border-red-600" : captured ? "border-green-600" : "border-brand-100"}`}
    >
      <h2 id="location-h" className="text-lg font-bold text-brand-900">
        <span aria-hidden="true">📍 </span>Your location
      </h2>

      {/* Status messages are announced to screen readers. */}
      <div aria-live="polite">
        {captured ? (
          <div className="mt-2">
            <p className="font-semibold text-green-800">
              <span aria-hidden="true">✓ </span>Location recorded
              {captured.accuracy != null ? ` — accurate to about ${Math.round(captured.accuracy)} m` : ""}
            </p>
            <p className="text-sm text-muted">
              At {new Date(captured.captured_at!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.{" "}
              <a href={mapsLink(captured.lat!, captured.lng!)} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline">
                Check it on Google Maps
              </a>
            </p>
            {weak && (
              <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                The reading isn&apos;t very precise. If you can, stand near a window or step outside, then try again.
              </p>
            )}
          </div>
        ) : without ? (
          <div className="mt-2">
            <p className="font-semibold text-amber-900">
              <span aria-hidden="true">! </span>Sending without a location
            </p>
            <p className="text-sm text-muted">The office will see: “{LOCATION_PROBLEMS[without.status as keyof typeof LOCATION_PROBLEMS]}”.</p>
          </div>
        ) : phase === "locating" ? (
          <p className="mt-2 font-semibold text-brand-800">Finding your location… this can take a few seconds.</p>
        ) : problem ? (
          <div className="mt-2 rounded-xl bg-red-50 p-3 text-red-900">
            {problem === "denied" ? (
              <>
                <p className="font-semibold">Location is blocked for this website.</p>
                <p className="mt-1 text-sm">
                  To allow it, tap the <span aria-hidden="true">🔒</span> or <span aria-hidden="true">ⓘ</span> next to the web address, choose{" "}
                  <strong>Permissions → Location → Allow</strong>, then tap “Try again”.
                </p>
              </>
            ) : problem === "unavailable" ? (
              <>
                <p className="font-semibold">Your phone couldn&apos;t find its location.</p>
                <p className="mt-1 text-sm">Check that Location is switched on in your phone&apos;s settings, move near a window, then try again.</p>
              </>
            ) : (
              <p className="font-semibold">This phone or browser can&apos;t share its location. You can still send your report.</p>
            )}
          </div>
        ) : (
          <p className="mt-1 text-muted">
            To confirm the visit, we record where your phone is <strong className="text-ink">once</strong>, now. We don&apos;t track you.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!captured && (
          <button
            type="button"
            onClick={locate}
            disabled={phase === "locating"}
            className="inline-flex min-h-12 items-center rounded-full bg-brand-800 px-5 font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
          >
            {phase === "locating" ? "Finding you…" : problem || without ? "Try again" : "Share my location"}
          </button>
        )}
        {captured && (
          <button type="button" onClick={locate} disabled={phase === "locating"} className="inline-flex min-h-12 items-center rounded-full border-2 border-brand-800 px-5 font-semibold text-brand-800 hover:bg-brand-50">
            {phase === "locating" ? "Finding you…" : "Try again"}
          </button>
        )}
        {problem && !without && (
          <button
            type="button"
            onClick={() => onChange({ status: problem })}
            className="inline-flex min-h-12 items-center rounded-full border-2 border-brand-200 px-5 font-semibold text-brand-800 hover:bg-brand-50"
          >
            Send without location
          </button>
        )}
      </div>

      {error && (
        <p id="location-error" className="mt-2 flex items-start gap-1.5 text-base font-semibold text-red-700">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </section>
  );
}
