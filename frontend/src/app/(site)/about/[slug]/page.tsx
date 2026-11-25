import { CmsPageView, cmsPageMetadata } from "@/components/CmsPageView";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

/** About sub-pages such as /about/how-we-care (built-in copy, or the owner's published version). */
export async function generateMetadata({ params }: Props) {
  return cmsPageMetadata(`about/${(await params).slug}`);
}

export default async function AboutSubPage({ params }: Props) {
  return <CmsPageView slug={`about/${(await params).slug}`} />;
}
