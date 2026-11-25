"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type SimpleLink = { label: string; href: string };

export function MobileNav({ links, cta }: { links: SimpleLink[]; cta?: SimpleLink }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-800 hover:bg-brand-50"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Main" className="absolute inset-x-0 top-full border-t border-brand-100 bg-white shadow-lg">
          <ul className="mx-auto max-w-6xl px-4 py-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="block rounded-lg px-3 py-3 font-medium text-brand-900 hover:bg-brand-50 aria-[current=page]:text-accent-600"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {cta && (
              <li className="pt-2">
                <Link href={cta.href} className="block rounded-full bg-accent-500 px-4 py-3 text-center font-semibold text-brand-950">
                  {cta.label}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
