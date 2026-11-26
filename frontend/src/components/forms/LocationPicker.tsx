"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";

type Pin = { lat: number; lng: number; source: "gps" | "map" | "search"; accuracy?: number };
type Place = { display_name: string; lat: string; lon: string };

const GHANA = { lat: 7.95, lng: -1.03, zoom: 6 };
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Lets someone show where care will happen: use the phone's location, search for a
 * place or landmark, or tap the map to drop a pin (and drag it to adjust).
 * The pin is sent with the form as care_lat / care_lng / location_source.
 */
export function LocationPicker() {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState<"gps" | "search" | null>(null);

  // Draws the map once, in the browser only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !box.current || map.current) return;
      const m = L.map(box.current, { scrollWheelZoom: false }).setView([GHANA.lat, GHANA.lng], GHANA.zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      m.on("click", (e) => placePin({ lat: e.latlng.lat, lng: e.latlng.lng, source: "map" }));
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  async function placePin(p: Pin, zoom?: number) {
    const L = (await import("leaflet")).default;
    const m = map.current;
    const next = { ...p, lat: round(p.lat), lng: round(p.lng) };
    setPin(next);
    setStatus(null);
    if (!m) return;
    if (!marker.current) {
      const icon = L.divIcon({
        className: "",
        html: '<span style="display:block;width:28px;height:28px;border-radius:50% 50% 50% 0;background:#f89a00;border:3px solid #3b0a5e;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      marker.current = L.marker([next.lat, next.lng], { draggable: true, icon, keyboard: true, title: "Care location (drag to adjust)" }).addTo(m);
      marker.current.on("dragend", () => {
        const ll = marker.current!.getLatLng();
        setPin({ lat: round(ll.lat), lng: round(ll.lng), source: "map" });
      });
    } else {
      marker.current.setLatLng([next.lat, next.lng]);
    }
    m.setView([next.lat, next.lng], zoom ?? Math.max(m.getZoom(), 16));
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("This phone or browser can't share its location. Search for the place or tap the map instead.");
      return;
    }
    setBusy("gps");
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        placePin({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps", accuracy: pos.coords.accuracy }, 17);
      },
      (err) => {
        setBusy(null);
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked on this device. You can allow it in your browser settings, or search for the place or tap the map."
            : "We couldn't find your location. Try again outside, or search for the place or tap the map.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  async function search() {
    const q = query.trim();
    if (q.length < 3) {
      setStatus("Type a town, area or landmark to search for, e.g. “Spintex Shell station”.");
      return;
    }
    setBusy("search");
    setStatus(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gh&limit=5&q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
      });
      const found = (await res.json()) as Place[];
      setResults(found);
      if (!found.length) setStatus("No places found. Try a nearby town or landmark, then move the pin.");
    } catch {
      setStatus("Search isn't working right now. Tap the map to drop a pin instead.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy === "gps"}
          className="min-h-12 flex-none rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
        >
          <span aria-hidden="true">📍 </span>
          {busy === "gps" ? "Finding…" : "Use my current location"}
        </button>
        <div className="flex flex-1 gap-2">
          <label htmlFor="place-search" className="sr-only">
            Search for a place or landmark in Ghana
          </label>
          <input
            id="place-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            placeholder="Search a place or landmark"
            className="min-h-12 w-full rounded-xl border border-brand-200 px-4 text-sm"
          />
          <button type="button" onClick={search} disabled={busy === "search"} className="min-h-12 flex-none rounded-full border-2 border-brand-800 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50">
            {busy === "search" ? "…" : "Find"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">Only use your current location if you are at the home where care will happen.</p>

      {results.length > 0 && (
        <ul className="divide-y divide-brand-100 rounded-xl border border-brand-100 bg-white text-sm" aria-label="Places found">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                className="block min-h-11 w-full px-4 py-2 text-left hover:bg-brand-50"
                onClick={() => {
                  setResults([]);
                  placePin({ lat: Number(r.lat), lng: Number(r.lon), source: "search" }, 16);
                }}
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={box} className="h-72 w-full overflow-hidden rounded-2xl border border-brand-100 bg-brand-50" aria-label="Map: tap to drop a pin where care will happen" role="application" />

      <p role="status" aria-live="polite" className="text-sm">
        {status ? (
          <span className="text-amber-800">{status}</span>
        ) : pin ? (
          <span className="text-green-800">
            ✓ Pin placed{pin.source === "gps" && pin.accuracy ? ` (accurate to about ${Math.round(pin.accuracy)} m)` : ""}. Drag it if it isn&apos;t quite right.{" "}
            <button
              type="button"
              className="font-semibold text-brand-800 underline"
              onClick={() => {
                marker.current?.remove();
                marker.current = null;
                setPin(null);
              }}
            >
              Remove pin
            </button>
          </span>
        ) : (
          <span className="text-muted">No pin yet (optional). Tap the map where the home is, or use the buttons above.</span>
        )}
      </p>

      <input type="hidden" name="care_lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="care_lng" value={pin?.lng ?? ""} />
      <input type="hidden" name="location_source" value={pin?.source ?? ""} />
      <input type="hidden" name="location_accuracy" value={pin?.accuracy ? Math.round(pin.accuracy) : ""} />
    </div>
  );
}
