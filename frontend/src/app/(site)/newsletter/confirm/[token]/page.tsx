import Link from "next/link";
import { createSecretClient } from "@/lib/supabase/server-auth";

export const metadata = { title: "Subscription", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The link in the confirmation email. Confirms the subscription. */
export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let ok = false;
  const db = createSecretClient();
  if (db && /^[0-9a-f-]{36}$/.test(token)) {
    const { data } = await db.from("newsletter_subscribers").select("id, status").eq("token", token).maybeSingle();
    if (data?.status === "pending") {
      await db.from("newsletter_subscribers").update({ status: "subscribed", confirmed_at: new Date().toISOString() }).eq("id", data.id);
    }
    ok = data?.status === "pending" || data?.status === "subscribed";
  }
  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center">
      <p aria-hidden="true" className="text-5xl">
        {ok ? "🎉" : "🔗"}
      </p>
      <h1 className="mt-4 text-3xl font-bold text-brand-900">{ok ? "You're subscribed" : "This link doesn't work any more"}</h1>
      <p className="mt-3 text-muted">
        {ok
          ? "Thank you. We'll email you when we publish new articles and news. Every email has a link to unsubscribe."
          : "You may have unsubscribed, or the link was copied incompletely. You can sign up again at the bottom of any page."}
      </p>
      <Link href="/journal" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand-800 px-6 font-semibold text-white hover:bg-brand-700">
        Read our latest articles
      </Link>
    </section>
  );
}
