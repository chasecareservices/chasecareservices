import Link from "next/link";
import { unsubscribe } from "@/app/(site)/newsletter-actions";

export const metadata = { title: "Unsubscribe", robots: { index: false } };

/**
 * Asks before unsubscribing, so email security scanners that open links don't
 * unsubscribe people by accident. Mail apps use the one-click link instead.
 */
export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const [{ token }, { done }] = await Promise.all([params, searchParams]);
  async function act(formData: FormData) {
    "use server";
    await unsubscribe(formData);
    const { redirect } = await import("next/navigation");
    redirect(`/newsletter/unsubscribe/${encodeURIComponent(String(formData.get("token")))}?done=1`);
  }
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      {done ? (
        <>
          <h1 className="text-3xl font-bold text-brand-900">You&apos;ve been unsubscribed</h1>
          <p className="mt-3 text-muted">We won&apos;t email you articles any more. You can sign up again at the bottom of any page.</p>
          <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand-800 px-6 font-semibold text-white hover:bg-brand-700">
            Go to the home page
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-brand-900">Unsubscribe from Chase Care news?</h1>
          <p className="mt-3 text-muted">You&apos;ll stop getting new articles and news by email.</p>
          <form action={act} className="mt-8">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="min-h-12 rounded-full bg-brand-800 px-6 font-semibold text-white hover:bg-brand-700">
              Yes, unsubscribe me
            </button>
          </form>
        </>
      )}
    </section>
  );
}
