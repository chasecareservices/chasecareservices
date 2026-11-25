"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isActive, type NavLink } from "@/lib/navigation";

const CLOSE_DELAY_MS = 150;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="currentColor">
      <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
    </svg>
  );
}

/**
 * Main menu for wide screens. Items with children open a dropdown panel on hover,
 * on click of the arrow, or from the keyboard (Enter/Space/↓ to open, Esc to close).
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

  // Close after navigating, on outside click, and on Escape.
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
    <nav ref={navRef} aria-label="Main" className="hidden xl:block">
      <ul className="flex items-center text-[0.8125rem] font-medium text-brand-900">
        {links.map((link, i) => {
          const active = isActive(link, pathname);
          const hasMenu = !!link.children?.length;
          const isOpen = open === i;
          const linkClass = `whitespace-nowrap rounded-full py-2 hover:bg-brand-50 hover:text-brand-700 ${
            active ? "text-brand-700 underline decoration-accent-500 decoration-2 underline-offset-8" : ""
          }`;

          if (!hasMenu) {
            return (
              <li key={link.href}>
                <Link href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={`${linkClass} px-1.5`}>
                  {link.label}
                </Link>
              </li>
            );
          }

          const menuId = `submenu-${i}`;
          return (
            <li
              key={link.href}
              className="relative"
              onMouseEnter={() => {
                cancelClose();
                setOpen(i);
              }}
              onMouseLeave={scheduleClose}
              onKeyDown={(e) => {
                if (e.key === "Escape" && isOpen) {
                  setOpen(null);
                  (e.currentTarget.querySelector("button") as HTMLButtonElement | null)?.focus();
                }
              }}
            >
              <div className="flex items-center">
                <Link href={link.href} className={`${linkClass} pl-1.5 pr-0.5`}>
                  {link.label}
                </Link>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={menuId}
                  aria-label={`${link.label} menu`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setOpen(i);
                      requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#${menuId} a`)?.focus());
                    }
                  }}
                  className="mr-0.5 rounded-full p-0.5 text-brand-700 hover:bg-brand-50"
                >
                  <Chevron open={isOpen} />
                </button>
              </div>
              <div
                id={menuId}
                hidden={!isOpen}
                className="absolute left-0 top-full z-50 pt-2"
              >
                <ul className="min-w-60 rounded-xl border border-brand-100 bg-white py-2 shadow-xl ring-1 ring-black/5">
                  {link.children!.map((child) => (
                    <li key={child.href + child.label}>
                      <Link
                        href={child.href}
                        aria-current={pathname === child.href ? "page" : undefined}
                        className="block whitespace-nowrap px-4 py-2.5 text-sm text-ink hover:bg-brand-50 hover:text-brand-800 focus:bg-brand-50 aria-[current=page]:font-semibold aria-[current=page]:text-brand-800"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
