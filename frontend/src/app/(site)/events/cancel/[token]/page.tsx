import type { Metadata } from "next";
import { cancelRegistration } from "@/app/(site)/event-actions";
import { ButtonLink, Container } from "@/components/ui";

export const metadata: Metadata = { title: "Cancel my place", robots: { index: false } };

export default async function CancelPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  return (
    <Container className="max-w-xl py-20 text-center">
      {done === "1" ? (
        <div role="status">
          <h1 className="text-3xl font-bold text-brand-900">Your place is cancelled</h1>
          <p className="mt-3 text-lg">Thank you for letting us know. We hope to see you at another event.</p>
        </div>
      ) : done === "0" || token === "invalid" ? (
        <div role="status">
          <h1 className="text-3xl font-bold text-brand-900">Nothing to cancel</h1>
          <p className="mt-3 text-lg">This place has already been cancelled, or the link is not valid.</p>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-brand-900">Can&apos;t come any more?</h1>
          <p className="mt-3 text-lg">Cancel your place so someone else can have it.</p>
          <form action={cancelRegistration} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="min-h-12 rounded-full bg-brand-800 px-6 font-semibold text-white hover:bg-brand-700">
              Yes, cancel my place
            </button>
          </form>
        </>
      )}
      <p className="mt-8">
        <ButtonLink href="/community/events" variant="outline">
          See other events
        </ButtonLink>
      </p>
    </Container>
  );
}
