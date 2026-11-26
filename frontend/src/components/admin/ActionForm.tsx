"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";

type Action = (formData: FormData) => Promise<{ error: string } | undefined>;

/**
 * Submits a form to a server action without clearing what was typed if saving fails.
 * On success the action redirects; on failure its message is shown above the buttons.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  confirm,
  className = "",
  secondary = false,
  inline = false,
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  /** Ask before submitting (e.g. deleting). */
  confirm?: string;
  className?: string;
  /** Red outline button, for deleting. */
  secondary?: boolean;
  /** Small purple button inside a card, instead of the sticky page bar. */
  inline?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);

  return (
    <form
      className={className}
      encType="multipart/form-data"
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const data = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const result = await action(data);
          if (result?.error) {
            setError(result.error);
            requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
          }
        });
      }}
    >
      {children}
      {error && (
        <p ref={errorRef} role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className={secondary || inline ? "mt-3" : "sticky bottom-0 -mx-4 mt-6 border-t border-gray-200 bg-gray-50/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8"}>
        <button
          type="submit"
          disabled={pending}
          className={
            secondary
              ? "inline-flex min-h-10 items-center rounded-full border border-red-300 px-5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              : inline
              ? "inline-flex min-h-10 items-center rounded-full bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
              : "inline-flex min-h-11 items-center rounded-full bg-brand-800 px-6 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
          }
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
