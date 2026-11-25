import Link from "next/link";
import type { ReactNode } from "react";
import { FillPhoto } from "@/components/Photo";
import type { SiteImage } from "@/lib/images";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "outline" | "light";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent-500 text-brand-950 hover:bg-accent-400",
  secondary: "bg-brand-800 text-white hover:bg-brand-700",
  outline: "border-2 border-brand-800 text-brand-800 hover:bg-brand-50",
  light: "bg-white text-brand-800 hover:bg-brand-50",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  const external = /^(https?:|tel:|mailto:)/.test(href);
  const classes = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${BUTTON_STYLES[variant]} ${className}`;
  return external ? (
    <a href={href} className={classes} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  tone = "white",
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: ReactNode;
  children?: ReactNode;
  tone?: "white" | "tint" | "brand";
}) {
  const toneClass =
    tone === "brand" ? "bg-brand-800 text-white" : tone === "tint" ? "bg-brand-50" : "bg-white";
  const muted = tone === "brand" ? "text-brand-100" : "text-muted";
  return (
    <section id={id} className={`py-14 sm:py-20 ${toneClass}`}>
      <Container>
        {(eyebrow || title || intro) && (
          <div className="mb-10 max-w-3xl">
            {eyebrow && (
              <p className={`mb-2 text-sm font-semibold uppercase tracking-widest ${tone === "brand" ? "text-accent-400" : "text-accent-600"}`}>
                {eyebrow}
              </p>
            )}
            {title && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>}
            {intro && <div className={`mt-4 text-lg leading-relaxed ${muted}`}>{intro}</div>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  actions,
  image,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
  /** Optional background photo, shown under a purple tint so the text stays readable. */
  image?: SiteImage;
}) {
  const hasPhoto = !!image?.src;
  return (
    <section className="relative isolate overflow-hidden bg-brand-800 text-white">
      {hasPhoto ? (
        <>
          <FillPhoto image={image} sizes="100vw" priority className="-z-20" watermark={false} />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/90 via-brand-900/75 to-brand-800/40" />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
        />
      )}
      <Container className={`relative ${hasPhoto ? "py-20 sm:py-28" : "py-14 sm:py-20"}`}>
        {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent-400">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {intro && <div className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-100">{intro}</div>}
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      </Container>
    </section>
  );
}

/**
 * Banner style 2: a photo strip with a purple band underneath holding a large title.
 * Shows the branded placeholder until a photo is supplied.
 */
export function BandHero({
  eyebrow,
  title,
  intro,
  image,
  people,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  image?: SiteImage;
  /** Several portraits shown side by side across the strip instead of one photo. */
  people?: SiteImage[];
}) {
  const portraits = (people ?? []).filter((p) => p.src);
  return (
    <section>
      {portraits.length > 0 ? (
        <ul
          className="grid h-48 gap-0.5 bg-brand-800 sm:h-72 lg:h-80"
          style={{ gridTemplateColumns: `repeat(${portraits.length}, minmax(0, 1fr))` }}
        >
          {portraits.map((p, i) => (
            <li key={p.src} className="relative overflow-hidden">
              <FillPhoto image={p} sizes={`${Math.ceil(100 / portraits.length)}vw`} priority={i < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative h-44 overflow-hidden sm:h-64 lg:h-80">
          <FillPhoto image={image} sizes="100vw" priority variant={2} />
        </div>
      )}
      <div className="border-b-4 border-accent-500 bg-brand-800 text-white">
        <Container className="py-6 sm:py-8">
          {eyebrow && <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-accent-400">{eyebrow}</p>}
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{title}</h1>
          {intro && <div className="mt-3 max-w-3xl text-lg text-brand-100">{intro}</div>}
        </Container>
      </div>
    </section>
  );
}

/** Photo beside text — alternates sides with `reverse`. */
export function ImageFeature({
  image,
  eyebrow,
  title,
  children,
  reverse = false,
  tone = "white",
  variant = 0,
}: {
  image: SiteImage;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  reverse?: boolean;
  tone?: "white" | "tint" | "brand";
  variant?: number;
}) {
  const toneClass = tone === "brand" ? "bg-brand-800 text-white" : tone === "tint" ? "bg-brand-50" : "bg-white";
  return (
    <section className={`py-14 sm:py-20 ${toneClass}`}>
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={`relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lg ${reverse ? "lg:order-2" : ""}`}>
          <FillPhoto image={image} sizes="(min-width: 1024px) 50vw, 100vw" variant={variant} />
        </div>
        <div>
          {eyebrow && (
            <p className={`mb-2 text-sm font-semibold uppercase tracking-widest ${tone === "brand" ? "text-accent-400" : "text-accent-600"}`}>
              {eyebrow}
            </p>
          )}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          <div className={`mt-5 space-y-5 text-lg leading-relaxed ${tone === "brand" ? "text-brand-100" : "text-muted"}`}>{children}</div>
        </div>
      </Container>
    </section>
  );
}

export function CheckList({ items, columns = 2 }: { items: string[]; columns?: 1 | 2 | 3 }) {
  const cols = columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <ul className={`grid gap-3 ${cols}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden="true" className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered pathway, e.g. Register → Screening → Training → … */
export function Pathway({ steps }: { steps: string[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
            {i + 1}
          </span>
          <span className="font-medium text-brand-900">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center">
      <p className="text-lg font-semibold text-brand-900">{title}</p>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "accent" | "neutral" }) {
  const tones = {
    brand: "bg-brand-100 text-brand-800",
    accent: "bg-accent-100 text-accent-700",
    neutral: "bg-gray-100 text-gray-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
