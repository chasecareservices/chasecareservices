"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/portal",
    label: "Today",
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    match: (p: string) => p === "/portal",
  },
  {
    href: "/portal/report/new",
    label: "New report",
    icon: <path d="M12 5v14M5 12h14" />,
    match: (p: string) => p.startsWith("/portal/report/new"),
    primary: true,
  },
  {
    href: "/portal/reports",
    label: "My reports",
    icon: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
    match: (p: string) => p.startsWith("/portal/reports") || (p.startsWith("/portal/report/") && !p.startsWith("/portal/report/new")),
  },
];

/**
 * Bottom tab bar: the three things a care worker does, always in the same place and
 * within thumb reach. Each tab has an icon and a word (never an icon alone).
 */
export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Portal" className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-3">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold ${
                  active ? "text-brand-800" : "text-muted hover:text-brand-800"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full ${
                    item.primary ? "bg-accent-500 text-brand-950" : active ? "bg-brand-100" : ""
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
