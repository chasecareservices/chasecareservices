import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="font-display text-6xl font-bold tracking-[0.2em] text-brand-200">404</p>
      <h1 className="mt-4 text-3xl font-bold text-brand-900">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-muted">It may have moved, or it isn&apos;t published yet.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Go to the homepage</ButtonLink>
        <ButtonLink href="/contact" variant="outline">
          Contact us
        </ButtonLink>
      </div>
    </Container>
  );
}
