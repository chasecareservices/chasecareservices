"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** 🔍 button in the header that opens a search box under the header. */
export function SearchButton() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-search"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-600 hover:bg-brand-50 hover:text-brand-800 aria-expanded:text-brand-800"
      >
        <span className="sr-only">{open ? "Close search" : "Search the website"}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </>
          )}
        </svg>
      </button>
      {open && (
        <div id="site-search" className="absolute inset-x-0 top-full z-40 border-t border-brand-100 bg-white shadow-lg">
          <form
            action="/search"
            method="get"
            role="search"
            className="mx-auto flex max-w-3xl gap-2 px-4 py-4 sm:px-6"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
              }
            }}
          >
            <label htmlFor="site-search-q" className="sr-only">
              Search the website
            </label>
            <input
              ref={inputRef}
              id="site-search-q"
              name="q"
              type="search"
              required
              maxLength={100}
              autoComplete="off"
              placeholder="Search services, courses, articles…"
              className="min-h-12 min-w-0 flex-1 rounded-full border border-brand-200 px-5 text-base text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button type="submit" className="min-h-12 flex-none rounded-full bg-brand-800 px-5 sm:px-6 font-semibold text-white hover:bg-brand-700">
              Search
            </button>
          </form>
        </div>
      )}
    </>
  );
}
