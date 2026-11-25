"use client";

import { useEffect, useRef, useState } from "react";
import {
  A11Y_EVENT,
  A11Y_STORAGE_KEY,
  ALL_A11Y_CLASSES,
  DEFAULT_A11Y,
  parsePrefs,
  prefClasses,
  type A11yPrefs,
} from "@/lib/a11y";

function readStored(): A11yPrefs {
  try {
    return parsePrefs(localStorage.getItem(A11Y_STORAGE_KEY));
  } catch {
    return DEFAULT_A11Y;
  }
}

function apply(prefs: A11yPrefs) {
  const html = document.documentElement;
  html.classList.remove(...ALL_A11Y_CLASSES);
  html.classList.add(...prefClasses(prefs));
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing etc.: preferences still apply for this page.
  }
  window.dispatchEvent(new Event(A11Y_EVENT));
}

const TOGGLES: { key: "contrast" | "links" | "font" | "motion"; label: string; hint: string }[] = [
  { key: "contrast", label: "High contrast", hint: "Darker text and stronger colours" },
  { key: "links", label: "Underline links", hint: "Make every link easy to spot" },
  { key: "font", label: "Readable font", hint: "Wider, plainer lettering" },
  { key: "motion", label: "Stop animations", hint: "No sliding or fading" },
];

/** ♿ tab on the right edge that opens the accessibility options. */
export function A11yMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_A11Y);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPrefs(readStored()), []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const update = (next: A11yPrefs) => {
    setPrefs(next);
    apply(next);
  };

  const active = prefClasses(prefs).length > 0;

  return (
    <div className="notranslate" translate="no">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        className="fixed right-0 top-1/2 z-50 flex h-12 w-11 -translate-y-1/2 items-center justify-center rounded-l-xl bg-accent-500 text-brand-950 shadow-lg hover:bg-accent-400"
      >
        <span className="sr-only">Accessibility options</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
          <circle cx="12" cy="4" r="2" />
          <path d="M19 8.5c0 .6-.4 1-1 1.1l-4 .5v3.4l1.9 6.2a1 1 0 1 1-1.9.6L12.3 15h-.6L10 20.3a1 1 0 1 1-1.9-.6l1.9-6.2v-3.4l-4-.5a1 1 0 0 1 .2-2l5.8.6 5.8-.6c.6-.1 1.2.4 1.2 1z" />
        </svg>
        {active && <span aria-hidden="true" className="absolute left-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-800 ring-2 ring-accent-500" />}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="a11y-heading"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              buttonRef.current?.focus();
            }
          }}
          className="fixed right-14 top-1/2 z-50 max-h-[90vh] w-[min(20rem,calc(100vw-5rem))] -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 text-ink shadow-2xl ring-1 ring-brand-100"
        >
          <div className="flex items-center justify-between">
            <h2 id="a11y-heading" className="text-lg font-bold text-brand-900">
              Accessibility
            </h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="rounded-full p-2 text-brand-700 hover:bg-brand-50"
            >
              <span className="sr-only">Close accessibility options</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-brand-900">Text size</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["A", "A+", "A++"] as const).map((label, size) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={prefs.textSize === size}
                  onClick={() => update({ ...prefs, textSize: size as 0 | 1 | 2 })}
                  className="min-h-11 rounded-lg border-2 border-brand-200 font-bold text-brand-800 aria-pressed:border-brand-800 aria-pressed:bg-brand-800 aria-pressed:text-white"
                  style={{ fontSize: `${0.9 + size * 0.15}rem` }}
                >
                  <span className="sr-only">{["Normal", "Larger", "Largest"][size]} text </span>
                  <span aria-hidden="true">{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <ul className="mt-5 space-y-2">
            {TOGGLES.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[t.key]}
                  onClick={() => update({ ...prefs, [t.key]: !prefs[t.key] })}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-brand-50"
                >
                  <span>
                    <span className="block font-medium text-brand-900">{t.label}</span>
                    <span className="block text-xs text-muted">{t.hint}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 flex-none rounded-full transition ${prefs[t.key] ? "bg-brand-800" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[t.key] ? "left-[1.375rem]" : "left-0.5"}`} />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => update(DEFAULT_A11Y)}
            disabled={!active}
            className="mt-5 w-full rounded-full border-2 border-brand-800 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset all
          </button>
          <p className="mt-3 text-center text-xs text-muted">Your choices are saved on this device.</p>
        </div>
      )}
    </div>
  );
}
