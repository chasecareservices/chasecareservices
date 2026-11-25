import Image from "next/image";
import type { SiteImage } from "@/lib/images";

/** Branded stand-in shown wherever a photo has not been supplied yet. */
/** Pass a position in `className` (e.g. "absolute inset-0"); defaults to "relative". */
export function BrandPlaceholder({
  variant = 0,
  className = "relative",
  watermark = true,
}: {
  variant?: number;
  className?: string;
  watermark?: boolean;
}) {
  const gradients = [
    "from-brand-700 via-brand-600 to-brand-400",
    "from-brand-800 via-brand-700 to-accent-600",
    "from-brand-600 via-brand-500 to-brand-300",
    "from-brand-900 via-brand-700 to-brand-500",
  ];
  return (
    <div aria-hidden="true" className={`overflow-hidden bg-gradient-to-br ${gradients[variant % gradients.length]} ${className}`}>
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent-500/30 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      {watermark && (
        <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold tracking-[0.3em] text-white/15 sm:text-6xl">
          CHASE
        </span>
      )}
    </div>
  );
}

/** A photo that fills its (positioned) parent, or the branded placeholder. */
export function FillPhoto({
  image,
  sizes,
  priority = false,
  variant = 0,
  className = "",
  watermark = true,
}: {
  image: SiteImage | null | undefined;
  sizes: string;
  priority?: boolean;
  variant?: number;
  className?: string;
  /** Show the faint CHASE mark on the placeholder (off where text sits on top). */
  watermark?: boolean;
}) {
  if (!image?.src) return <BrandPlaceholder variant={variant} watermark={watermark} className={`absolute inset-0 ${className}`} />;
  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
      style={image.focus ? { objectPosition: image.focus } : undefined}
    />
  );
}
