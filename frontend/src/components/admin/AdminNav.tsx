"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type AdminNavItem = { label: string; href: string; badge?: number };
export type AdminNavGroup = { title?: string; items: AdminNavItem[] };

function NavGroups({ groups, pathname }: { groups: AdminNavGroup[]; pathname: string }) {
  return (
    <div className="space-y-6">
      {groups.map((g, i) => (
        <div key={g.title ?? i}>
          {g.title && <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-brand-300">{g.title}</p>}
          <NavLinks items={g.items} pathname={pathname} />
        </div>
      ))}
    </div>
  );
}

function NavLinks({ items, pathname }: { items: AdminNavItem[]; pathname: string }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
              {!!item.badge && (
                <span className="rounded-full bg-accent-500 px-2 py-0.5 text-xs font-bold text-brand-950">{item.badge}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Sidebar on wide screens; a menu button on phones. */
export function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <nav aria-label="Dashboard" className="hidden lg:block">
        <NavGroups groups={groups} pathname={pathname} />
      </nav>
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white"
        >
          {open ? "Close menu" : "Menu"}
        </button>
        {open && (
          <nav id="admin-mobile-nav" aria-label="Dashboard" className="absolute inset-x-0 top-full z-40 max-h-[80vh] overflow-y-auto bg-brand-900 p-4 shadow-xl">
            <NavGroups groups={groups} pathname={pathname} />
          </nav>
        )}
      </div>
    </>
  );
}
