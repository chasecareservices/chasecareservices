import Link from "next/link";
import { signOutWorker } from "@/app/portal/actions";
import { LogoMark } from "@/components/LogoMark";
import { PortalNav } from "@/components/portal/PortalNav";
import { getSiteSettings } from "@/lib/content";
import { phoneDigits } from "@/lib/format";
import { requireWorker } from "@/lib/portal/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const [worker, settings] = await Promise.all([requireWorker(), getSiteSettings()]);
  return (
    <div className="min-h-screen bg-brand-50/60 pb-28 text-[1.0625rem]">
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/portal" className="flex items-center gap-2.5" aria-label="Care worker portal home">
            <LogoMark className="h-9 w-auto" />
            <span>
              <span className="block font-display text-lg font-bold leading-none tracking-[0.18em] text-brand-800">
                C<span className="text-accent-500">H</span>A<span className="text-accent-500">S</span>E
              </span>
              <span className="block text-[0.6rem] font-semibold uppercase tracking-wider text-muted">Care worker portal</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {settings.phone && (
              <a
                href={`tel:${phoneDigits(settings.phone)}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-brand-800 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Call office
              </a>
            )}
            <form action={signOutWorker}>
              <button type="submit" className="min-h-11 whitespace-nowrap rounded-full px-2 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-xl px-4 py-6">
        <p className="sr-only">Signed in as {worker.displayName}</p>
        {children}
      </main>
      <PortalNav />
    </div>
  );
}
