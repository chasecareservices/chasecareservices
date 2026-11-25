"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FillPhoto } from "@/components/Photo";
import { A11Y_EVENT, motionStopped } from "@/lib/a11y";
import type { HeroSlide } from "@/lib/images";

const INTERVAL_MS = 7000;

/**
 * Full-width homepage slider. Fades between slides, pauses while the visitor hovers,
 * focuses or switches tab, and never moves on its own for people who prefer reduced motion.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const regionRef = useRef<HTMLElement>(null);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  // Device setting "reduce motion", or "Stop animations" in the ♿ menu.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(motionStopped());
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener(A11Y_EVENT, sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener(A11Y_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, reducedMotion]);

  if (!count) return null;

  return (
    <section
      ref={regionRef}
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="relative isolate overflow-hidden bg-brand-900 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="relative min-h-[34rem] sm:min-h-[38rem] lg:min-h-[40rem]">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${active ? "z-10 opacity-100" : "z-0 opacity-0"}`}
            >
              <FillPhoto image={slide.image} sizes="100vw" priority={i === 0} variant={i} watermark={false} />
              {/* Purple tint so white text is always readable over any photo. */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-950/90 via-brand-900/70 to-brand-800/20" />
              <div className="relative mx-auto flex h-full min-h-[34rem] max-w-6xl flex-col justify-center px-4 pb-20 pt-14 sm:min-h-[38rem] sm:px-6 lg:min-h-[40rem] lg:px-8">
                {slide.eyebrow && (
                  <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent-400">{slide.eyebrow}</p>
                )}
                {i === 0 ? (
                  <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{slide.heading}</h1>
                ) : (
                  <h2 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{slide.heading}</h2>
                )}
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100">{slide.text}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {slide.buttons.map((b, bi) => (
                    <Link
                      key={b.href + b.label}
                      href={b.href}
                      className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                        bi === 0 ? "bg-accent-500 text-brand-950 hover:bg-accent-400" : "bg-white text-brand-800 hover:bg-brand-50"
                      }`}
                    >
                      {b.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show slide ${i + 1}: ${s.heading}`}
                  aria-current={i === index}
                  className="flex h-11 items-center px-1"
                >
                  <span className={`block h-2 rounded-full transition-all ${i === index ? "w-8 bg-accent-500" : "w-2 bg-white/60 hover:bg-white"}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous slide"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-brand-950/30 hover:bg-brand-950/60"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next slide"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-brand-950/30 hover:bg-brand-950/60"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
