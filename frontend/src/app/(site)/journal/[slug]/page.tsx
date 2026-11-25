import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBlocks, toBlocks } from "@/components/PageBlocks";
import { Container } from "@/components/ui";
import { getPost, mediaUrl } from "@/lib/content";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    openGraph: { type: "article", publishedTime: post.published_at ?? undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const cover = mediaUrl(post.cover_image_path);

  return (
    <article>
      <header className="bg-brand-50">
        <Container className="py-12 sm:py-16">
          <Link href="/journal" className="text-sm font-semibold text-brand-700 hover:underline">
            ← The ChaseCare Journal
          </Link>
          {post.category && (
            <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-accent-600">{post.category.name}</p>
          )}
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mt-4 max-w-2xl text-lg text-muted">{post.excerpt}</p>}
          <p className="mt-6 text-sm text-muted">
            {post.author_name && <>By {post.author_name} · </>}
            {post.published_at && (
              <time dateTime={post.published_at}>
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.published_at))}
              </time>
            )}
          </p>
        </Container>
      </header>
      {cover && (
        <Container className="pt-10">
          <Image src={cover} alt="" width={1200} height={630} className="h-auto w-full rounded-3xl object-cover" />
        </Container>
      )}
      <div className="py-8">
        <PageBlocks blocks={toBlocks(post.body)} />
      </div>
    </article>
  );
}
