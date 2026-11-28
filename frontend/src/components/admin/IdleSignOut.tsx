"use client";

import { useEffect, useRef, useState } from "react";
import { signOutIdle } from "@/app/admin/actions";

const WARN_SECONDS = 60;

/**
 * Signs staff out of the dashboard after `minutes` with no activity, with a one-minute
 * warning. Activity in any open tab counts (shared through localStorage).
 */
export function IdleSignOut({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState<number | null>(null);
  const stay = useRef<HTMLButtonElement>(null);
  const KEY = "chase-admin-last-activity";

  useEffect(() => {
    const limit = minutes * 60_000;
    const mark = () => {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* private mode: this tab only */
      }
      (window as unknown as { __chaseLast?: number }).__chaseLast = Date.now();
    };
    const last = () => {
      let v = (window as unknown as { __chaseLast?: number }).__chaseLast ?? Date.now();
      try {
        v = Math.max(v, Number(localStorage.getItem(KEY) ?? 0));
      } catch {
        /* ignore */
      }
      return v;
    };
    mark();
    let lastMove = 0;
    const onActivity = (e: Event) => {
      // Mouse moves are frequent: count them at most every 10 seconds.
      if (e.type === "mousemove") {
        if (Date.now() - lastMove < 10_000) return;
        lastMove = Date.now();
      }
      mark();
    };
    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"] as const;
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    const timer = window.setInterval(() => {
      const remaining = Math.round((last() + limit - Date.now()) / 1000);
      if (remaining <= 0) {
        window.clearInterval(timer);
        void signOutIdle();
      } else if (remaining <= WARN_SECONDS) {
        setLeft(remaining);
      } else {
        setLeft(null);
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
    };
  }, [minutes]);

  useEffect(() => {
    if (left !== null) stay.current?.focus();
  }, [left !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (left === null) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="idle-h" aria-describedby="idle-d" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="idle-h" className="text-xl font-bold text-brand-900">
          Still there?
        </h2>
        <p id="idle-d" className="mt-2 text-sm">
          For security you&apos;ll be signed out in <strong>{left} seconds</strong> because the dashboard hasn&apos;t been used.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            ref={stay}
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(KEY, String(Date.now()));
              } catch {
                /* ignore */
              }
              (window as unknown as { __chaseLast?: number }).__chaseLast = Date.now();
              setLeft(null);
            }}
            className="min-h-11 rounded-full bg-brand-800 px-5 font-semibold text-white hover:bg-brand-700"
          >
            Stay signed in
          </button>
          <button type="button" onClick={() => void signOutIdle()} className="min-h-11 rounded-full px-5 font-semibold text-brand-800 ring-1 ring-brand-300 hover:bg-brand-50">
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
