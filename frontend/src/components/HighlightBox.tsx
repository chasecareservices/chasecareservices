import Link from "next/link";

export type HighlightItem = { lead: string; href?: string; text: string };

function Check() {
  return (
    <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 border-accent-500 bg-accent-500/10 text-accent-400">
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 10.5l3.2 3L15 6.5" />
      </svg>
    </span>
  );
}

/** Deep-purple panel with ✓ items; each item's lead words link to the relevant page. */
export function HighlightBox({ intro, items }: { intro: string; items: HighlightItem[] }) {
  return (
    <div className="bg-brand-900 px-6 py-8 text-white sm:px-8">
      <p className="text-lg font-bold">{intro}</p>
      <ul className="mt-6 space-y-6">
        {items.map((item) => (
          <li key={item.lead} className="flex gap-4">
            <Check />
            <p className="leading-relaxed text-brand-100">
              {item.href ? (
                <Link href={item.href} className="font-semibold text-accent-400 underline-offset-4 hover:underline">
                  {item.lead}
                </Link>
              ) : (
                <strong className="text-accent-400">{item.lead}</strong>
              )}{" "}
              {item.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
