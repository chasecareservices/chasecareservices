import Link from "next/link";
import { signOutFamily } from "@/app/family/actions";
import { LogoMark } from "@/components/LogoMark";
import { getSiteSettings } from "@/lib/content";
import { requireFamily } from "@/lib/family/session";
import { phoneDigits } from "@/lib/format";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const [family, settings] = await Promise.all([requireFamily(), getSiteSettings()]);
  return (
    <div className="min-h-screen bg-brand-50/60 pb-16 text-[1.0625rem]">
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/family" className="flex items-center gap-2.5" aria-label="Family portal home">
            <LogoMark className="h-9 w-auto" />
            <span>
              <span className="block font-display text-lg font-bold leading-none tracking-[0.18em] text-brand-800">
                C<span className="text-accent-600">H</span>A<span className="text-accent-600">S</span>E
              </span>
              <span className="block text-[0.6rem] font-semibold uppercase tracking-wider text-muted">Family portal</span>
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
            <form action={signOutFamily}>
              <button type="submit" className="min-h-11 whitespace-nowrap rounded-full px-2 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-6">
        <p className="sr-only">Signed in as {family.displayName}</p>
        {children}
      </main>
    </div>
  );
}
