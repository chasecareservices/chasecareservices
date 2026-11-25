"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isActive, type NavLink } from "@/lib/navigation";

export function MobileNav({ links, cta }: { links: NavLink[]; cta?: NavLink }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();

  // Close the menu after navigating.
  useEffect(() => {
    setOpen(false);
    setExpanded(null);
  }, [pathname]);

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
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="absolute inset-x-0 top-full max-h-[calc(100vh-5rem)] overflow-y-auto border-t border-brand-100 bg-white shadow-lg"
        >
          <ul className="mx-auto max-w-6xl px-4 pb-28 pt-3 sm:pb-3">
            {links.map((link) => {
              const hasMenu = !!link.children?.length;
              const isExpanded = expanded === link.href;
              const active = isActive(link, pathname);
              return (
                <li key={link.href} className="border-b border-brand-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <Link
                      href={link.href}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className={`block flex-1 rounded-lg px-3 py-3 font-medium hover:bg-brand-50 ${active ? "text-accent-700" : "text-brand-900"}`}
                    >
                      {link.label}
                    </Link>
                    {hasMenu && (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`mobile-sub-${link.href}`}
                        aria-label={`${isExpanded ? "Hide" : "Show"} ${link.label} pages`}
                        onClick={() => setExpanded(isExpanded ? null : link.href)}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-brand-700 hover:bg-brand-50"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="currentColor"
                        >
                          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {hasMenu && isExpanded && (
                    <ul id={`mobile-sub-${link.href}`} className="mb-2 ml-3 border-l-2 border-accent-200 pl-2">
                      {link.children!.map((child) => (
                        <li key={child.href + child.label}>
                          <Link
                            href={child.href}
                            aria-current={pathname === child.href ? "page" : undefined}
                            className="block rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-brand-50 aria-[current=page]:font-semibold aria-[current=page]:text-brand-800"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {cta && (
              <li className="pt-3">
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
