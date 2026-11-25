import Image from "next/image";
import { ButtonLink, CheckList, Container } from "@/components/ui";
import { mediaUrl } from "@/lib/content";
import { paragraphs } from "@/lib/format";

/**
 * Renders the content blocks editors build in the admin dashboard.
 * Block shape: { type, visible, data }. Unknown or hidden blocks are skipped,
 * so new block types can be added without breaking existing pages.
 */
export type Block = { type: string; visible?: boolean; data?: Record<string, unknown> };

type ButtonData = { label?: string; href?: string };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const strArray = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function toBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value.filter((b): b is Block => !!b && typeof b === "object" && typeof (b as Block).type === "string");
}

export function PageBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks
        .filter((b) => b.visible !== false)
        .map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  const d = block.data ?? {};
  switch (block.type) {
    case "heading":
      return (
        <Container className="pt-10">
          <h2 className="text-2xl font-bold text-brand-900 sm:text-3xl">{str(d.text)}</h2>
        </Container>
      );
    case "paragraph":
    case "text":
      return (
        <Container className="py-4">
          <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-ink">
            {str(d.heading) && <h2 className="text-2xl font-bold text-brand-900">{str(d.heading)}</h2>}
            {paragraphs(str(d.text)).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Container>
      );
    case "list":
      return (
        <Container className="py-6">
          {str(d.heading) && <h2 className="mb-4 text-2xl font-bold text-brand-900">{str(d.heading)}</h2>}
          <CheckList items={strArray(d.items)} />
        </Container>
      );
    case "image": {
      const src = mediaUrl(str(d.path));
      if (!src) return null;
      return (
        <Container className="py-6">
          <figure>
            <Image src={src} alt={str(d.alt) ?? ""} width={1200} height={675} className="h-auto w-full rounded-2xl object-cover" />
            {str(d.caption) && <figcaption className="mt-2 text-sm text-muted">{str(d.caption)}</figcaption>}
          </figure>
        </Container>
      );
    }
    case "cta_band": {
      const buttons = (Array.isArray(d.buttons) ? d.buttons : []) as ButtonData[];
      if (!str(d.heading) && !buttons.length) return null;
      return (
        <div className="my-10 bg-brand-800 py-12 text-white">
          <Container>
            {str(d.heading) && <h2 className="text-2xl font-bold sm:text-3xl">{str(d.heading)}</h2>}
            {str(d.text) && <p className="mt-3 max-w-2xl text-brand-100">{str(d.text)}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              {buttons
                .filter((b) => b.href && b.label)
                .map((b) => (
                  <ButtonLink key={b.href} href={b.href!}>
                    {b.label}
                  </ButtonLink>
                ))}
            </div>
          </Container>
        </div>
      );
    }
    default:
      return null;
  }
}
