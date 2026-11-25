"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isActive, type NavLink } from "@/lib/navigation";

const CLOSE_DELAY_MS = 150;
/** Dropdowns with more items than this use two columns. */
const TWO_COLUMN_AFTER = 8;

/**
 * Main menu for wide screens. A section's dropdown opens when the mouse is over it.
 * Keyboard: Tab moves across the sections, ↓ opens a section's list and moves into it,
 * Esc closes it and returns to the section link.
 */
export function DesktopNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(null), CLOSE_DELAY_MS);
  };

  // Close after navigating and on outside click.
  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);
  useEffect(() => cancelClose, []);

  return (
    <nav ref={navRef} aria-label="Main" className="hidden self-stretch xl:flex">
      <ul className="flex items-stretch gap-1">
        {links.map((link, i) => {
          // A top-level link for this exact section wins over a parent that merely lists it.
          const ownMatch = links.findIndex((l) => isActive({ label: l.label, href: l.href }, pathname));
          const active = ownMatch >= 0 ? ownMatch === i : isActive(link, pathname);
          const items = link.children ?? [];
          const hasMenu = items.length > 0;
          const isOpen = open === i;
          const menuId = `submenu-${i}`;
          const twoColumns = items.length > TWO_COLUMN_AFTER;

          return (
            <li
              key={link.href}
              className="relative flex items-center"
              onMouseEnter={() => {
                cancelClose();
                if (hasMenu) setOpen(i);
              }}
              onMouseLeave={scheduleClose}
              onFocus={() => {
                // Keep this section's list open while moving through it; close any other one.
                cancelClose();
                setOpen((current) => (current === i ? i : null));
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleClose();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && isOpen) {
                  setOpen(null);
                  e.currentTarget.querySelector<HTMLAnchorElement>("a")?.focus();
                }
              }}
            >
              <Link
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                aria-haspopup={hasMenu ? "true" : undefined}
                aria-expanded={hasMenu ? isOpen : undefined}
                aria-controls={hasMenu ? menuId : undefined}
                onKeyDown={(e) => {
                  if (hasMenu && e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(i);
                    requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#${menuId} a`)?.focus());
                  }
                }}
                className={`whitespace-nowrap px-3 py-2 text-[0.9375rem] font-semibold transition-colors decoration-2 underline-offset-[10px] ${
                  active || isOpen
                    ? "text-brand-800 underline decoration-accent-500"
                    : "text-gray-600 hover:text-brand-800 hover:underline hover:decoration-brand-200"
                }`}
              >
                {link.label}
              </Link>

              {hasMenu && (
                <div id={menuId} hidden={!isOpen} className="absolute left-0 top-full z-50 -mt-2 pt-2">
                  <ul
                    className={`bg-white py-2 shadow-[0_10px_30px_-8px_rgba(42,6,68,0.35)] ring-1 ring-black/5 ${
                      twoColumns ? "grid w-[34rem] grid-cols-2" : "min-w-64"
                    }`}
                  >
                    {items.map((child) => (
                      <li key={child.href + child.label}>
                        <Link
                          href={child.href}
                          aria-current={pathname === child.href ? "page" : undefined}
                          className="block whitespace-nowrap px-5 py-3 text-[0.9375rem] text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-800 focus:bg-brand-50 focus:text-brand-800 aria-[current=page]:font-semibold aria-[current=page]:text-brand-800"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
