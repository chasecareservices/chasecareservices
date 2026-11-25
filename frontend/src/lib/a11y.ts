/**
 * Accessibility preferences chosen in the ♿ menu. Stored on the visitor's device only
 * (localStorage) and applied as classes on <html>, which globals.css styles.
 */
export type A11yPrefs = {
  textSize: 0 | 1 | 2;
  contrast: boolean;
  links: boolean;
  font: boolean;
  motion: boolean; // true = stop animations
};

export const A11Y_STORAGE_KEY = "chase-a11y";
export const A11Y_EVENT = "chase-a11y-change";

export const DEFAULT_A11Y: A11yPrefs = { textSize: 0, contrast: false, links: false, font: false, motion: false };

export function parsePrefs(raw: string | null): A11yPrefs {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<A11yPrefs>) : {};
    const size = v.textSize === 1 || v.textSize === 2 ? v.textSize : 0;
    return { textSize: size, contrast: v.contrast === true, links: v.links === true, font: v.font === true, motion: v.motion === true };
  } catch {
    return DEFAULT_A11Y;
  }
}

/** The <html> classes for a set of preferences. */
export function prefClasses(p: A11yPrefs): string[] {
  return [
    p.textSize === 1 ? "a11y-text-1" : null,
    p.textSize === 2 ? "a11y-text-2" : null,
    p.contrast ? "a11y-contrast" : null,
    p.links ? "a11y-links" : null,
    p.font ? "a11y-font" : null,
    p.motion ? "a11y-no-motion" : null,
  ].filter((c): c is string => c !== null);
}

export const ALL_A11Y_CLASSES = ["a11y-text-1", "a11y-text-2", "a11y-contrast", "a11y-links", "a11y-font", "a11y-no-motion"];

/**
 * Runs in <head> before the page is shown, so saved preferences apply without a flash.
 * Kept tiny and dependency-free on purpose.
 */
export const A11Y_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("${A11Y_STORAGE_KEY}")||"{}"),c=document.documentElement.classList;if(p.textSize===1)c.add("a11y-text-1");if(p.textSize===2)c.add("a11y-text-2");if(p.contrast===true)c.add("a11y-contrast");if(p.links===true)c.add("a11y-links");if(p.font===true)c.add("a11y-font");if(p.motion===true)c.add("a11y-no-motion");}catch(e){}})();`;

/** True when animations should not play (device setting or the ♿ menu). */
export function motionStopped(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.classList.contains("a11y-no-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
