import type { Metadata } from "next";
import { ProductCard } from "@/components/cards";
import { ButtonLink, EmptyState, PageHero, Section } from "@/components/ui";
import { getProducts } from "@/lib/content";
import { PAGE_BANNERS } from "@/lib/images";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ChaseCare Shop",
  description: "Care ID cards, lanyards, ChaseCare clothing, training materials and care-related merchandise.",
};

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <>
      <PageHero
        image={PAGE_BANNERS["shop"]}
        eyebrow="Shop"
        title="The ChaseCare Shop"
        intro="Care ID cards, lanyards, ChaseCare T-shirts, branded clothing, training materials and other approved products."
      />
      <Section>
        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="Our shop is opening soon">Online ordering and payment are coming soon.</EmptyState>
        )}
        <div className="mt-10 rounded-3xl bg-brand-50 p-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-brand-900">
            <strong>Online ordering is coming soon.</strong> To order now, send us a message with the items and sizes you need.
          </p>
          <ButtonLink href="/contact?topic=contact&subject=Shop%20order" className="mt-4 sm:mt-0">
            Order by message
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
