import Link from "next/link";
import { signOutLearner } from "@/app/learn/actions";
import { LogoMark } from "@/components/LogoMark";
import { requireLearner } from "@/lib/learn/session";

// Every learner page depends on who is signed in: never pre-build them.
export const dynamic = "force-dynamic";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const learner = await requireLearner();
  return (
    <div className="min-h-screen bg-brand-50/60 text-[1.0625rem]">
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/learn" className="flex items-center gap-2.5" aria-label="ChaseCare Academy: my learning">
            <LogoMark className="h-9 w-auto" />
            <span>
              <span className="block font-display text-lg font-bold leading-none tracking-[0.18em] text-brand-800">
                C<span className="text-accent-500">H</span>A<span className="text-accent-500">S</span>E
              </span>
              <span className="block text-[0.6rem] font-semibold uppercase tracking-wider text-muted">Academy · My learning</span>
            </span>
          </Link>
          <nav aria-label="Learning" className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
            {learner.isWorker && (
              <Link href="/portal" className="hidden min-h-11 items-center rounded-full px-3 text-brand-800 hover:bg-brand-50 sm:inline-flex">
                Care worker portal
              </Link>
            )}
            <form action={signOutLearner}>
              <button type="submit" className="min-h-11 rounded-full px-3 text-brand-800 underline-offset-4 hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <p className="sr-only">Signed in as {learner.displayName}</p>
        {children}
      </main>
    </div>
  );
}
