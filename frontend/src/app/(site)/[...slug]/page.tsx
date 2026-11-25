import { CmsPageView, cmsPageMetadata } from "@/components/CmsPageView";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props) {
  return cmsPageMetadata((await params).slug.join("/"));
}

export default async function CmsPage({ params }: Props) {
  return <CmsPageView slug={(await params).slug.join("/")} />;
}
