import Link from "next/link";

const TAGLINE: { word: string; accent: boolean }[] = [
  { word: "Help", accent: false },
  { word: "Care", accent: true },
  { word: "Assist", accent: false },
  { word: "Support", accent: true },
  { word: "Empower", accent: false },
];

/**
 * Text wordmark matching the CHASE logo (purple letters, orange H and S).
 * Swap for the official logo file (SVG/PNG) once it is supplied.
 */
export function Logo({
  withTagline = true,
  inverted = false,
  compactOnLaptop = false,
}: {
  withTagline?: boolean;
  inverted?: boolean;
  /** Hide the tagline between 1280px and 1536px, where the full header menu needs the room. */
  compactOnLaptop?: boolean;
}) {
  const base = inverted ? "text-white" : "text-brand-800";
  return (
    <Link href="/" className="inline-flex flex-col items-start leading-none" aria-label="Chase Care Services — home">
      <span className={`font-display text-2xl font-bold tracking-[0.18em] sm:text-3xl ${base}`} aria-hidden="true">
        C<span className="text-accent-500">H</span>A<span className="text-accent-500">S</span>E
      </span>
      {withTagline && (
        <span
          className={`mt-1 hidden whitespace-nowrap text-[0.55rem] font-semibold uppercase tracking-[0.12em] sm:block ${compactOnLaptop ? "xl:hidden 2xl:block" : ""}`}
          aria-hidden="true"
        >
          {TAGLINE.map((t, i) => (
            <span key={t.word}>
              {i > 0 && <span className={inverted ? "text-white/50" : "text-brand-300"}> | </span>}
              <span className={t.accent ? "text-accent-500" : base}>{t.word}</span>
            </span>
          ))}
        </span>
      )}
    </Link>
  );
}
