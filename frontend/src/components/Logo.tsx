import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

const TAGLINE: { word: string; accent: boolean }[] = [
  { word: "Help", accent: false },
  { word: "Care", accent: true },
  { word: "Assist", accent: false },
  { word: "Support", accent: true },
  { word: "Empower", accent: false },
];

/**
 * The CHASE logo: the hands-and-people mark, then the wordmark (purple letters, orange H and S)
 * and the Help | Care | Assist | Support | Empower tagline.
 */
export function Logo({
  withTagline = true,
  inverted = false,
  compactOnLaptop = false,
  markClassName = "h-10 w-auto flex-none sm:h-12",
}: {
  withTagline?: boolean;
  inverted?: boolean;
  /** Hide the tagline between 1280px and 1536px, where the full header menu needs the room. */
  compactOnLaptop?: boolean;
  /** Size of the hands-and-people mark. */
  markClassName?: string;
}) {
  const base = inverted ? "text-white" : "text-brand-800";
  return (
    <Link
      href="/"
      translate="no"
      className="notranslate inline-flex items-center gap-2.5 leading-none sm:gap-3"
      aria-label="Chase Care Services — home"
    >
      <LogoMark inverted={inverted} className={markClassName} />
      <span className="flex flex-col items-start">
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
      </span>
    </Link>
  );
}
