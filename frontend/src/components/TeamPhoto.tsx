import Image from "next/image";

/**
 * A round team photo. Many portraits are half- or full-length, so the office
 * chooses how to frame each one (team_members.photo_crop):
 *   close  head-and-shoulders photo, fills the circle as it is
 *   upper  half-length photo, zoomed a little towards the face
 *   full   full-length photo, zoomed in on the face
 */
const FRAMES: Record<string, { width: string; left: string; top: string } | undefined> = {
  upper: { width: "150%", left: "-25%", top: "0%" },
  full: { width: "230%", left: "-65%", top: "-4%" },
};

export function TeamPhoto({ src, alt, crop, className = "h-24 w-24" }: { src: string; alt: string; crop?: string | null; className?: string }) {
  const frame = crop ? FRAMES[crop] : undefined;
  return (
    <div className={`relative flex-none overflow-hidden rounded-full bg-brand-100 ${className}`}>
      {frame ? (
        <Image
          src={src}
          alt={alt}
          width={400}
          height={600}
          sizes="220px"
          className="absolute h-auto max-w-none"
          style={{ width: frame.width, left: frame.left, top: frame.top }}
        />
      ) : (
        <Image src={src} alt={alt} fill sizes="96px" className="object-cover" />
      )}
    </div>
  );
}
