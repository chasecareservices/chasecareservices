"use client";

import { useEffect } from "react";
import { LANGUAGES, SOURCE_LANGUAGE, languageFromCookie } from "@/lib/languages";

declare global {
  interface Window {
    googleTranslateInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (options: Record<string, unknown>, elementId: string) => unknown;
      };
    };
  }
}

const SCRIPT_ID = "google-translate-script";

/**
 * Google Translate edits the page's text directly, which can make React crash with
 * "Failed to execute 'removeChild'" when the page later changes. This makes those two DOM
 * methods tolerant of nodes Google has moved. Only installed while a translation is active.
 */
function patchDomForTranslation() {
  const proto = Node.prototype as Node & { __chasePatched?: boolean };
  if (proto.__chasePatched) return;
  proto.__chasePatched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

/**
 * Loads Google Translate only when the visitor has chosen a language other than English,
 * so nothing is sent to Google for everyone else.
 */
export function TranslateLoader() {
  useEffect(() => {
    const language = languageFromCookie(document.cookie);
    if (language === SOURCE_LANGUAGE || document.getElementById(SCRIPT_ID)) return;

    patchDomForTranslation();
    document.documentElement.lang = language;

    window.googleTranslateInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      if (!TranslateElement) return;
      new TranslateElement(
        {
          pageLanguage: SOURCE_LANGUAGE,
          includedLanguages: LANGUAGES.map((l) => l.code).filter((c) => c !== SOURCE_LANGUAGE).join(","),
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Google needs an element to attach its (hidden) widget to.
  return <div id="google_translate_element" hidden />;
}
