"use client";

import { useEffect, useState } from "react";
import { FillPhoto } from "@/components/Photo";
import { A11Y_EVENT, motionStopped } from "@/lib/a11y";
import type { SiteImage } from "@/lib/images";

const INTERVAL_MS = 6000;

/**
 * Background photos that fade from one to the next (e.g. behind a page banner).
 * Has a pause button, and stays on the first photo when motion is turned off.
 */
export function PhotoFader({ images }: { images: SiteImage[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(motionStopped());
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener(A11Y_EVENT, sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener(A11Y_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (images.length < 2 || paused || still) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % images.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [images.length, paused, still]);

  return (
    <>
      {images.map((image, i) => (
        <div
          key={image.src ?? i}
          aria-hidden={i !== index}
          className={`absolute inset-0 -z-20 transition-opacity duration-1000 ease-out ${i === index ? "opacity-100" : "opacity-0"}`}
        >
          <FillPhoto image={image} sizes="100vw" priority={i === 0} watermark={false} />
        </div>
      ))}
      {images.length > 1 && !still && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play photo slideshow" : "Pause photo slideshow"}
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-brand-950/40 text-white hover:bg-brand-950/70"
        >
          {paused ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
          )}
        </button>
      )}
    </>
  );
}
