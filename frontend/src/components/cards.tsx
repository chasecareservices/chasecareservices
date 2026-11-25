import Link from "next/link";
import type { Course, Post, Product, Service } from "@/lib/content";
import { Badge } from "@/components/ui";
import { certificationLabel, formatMoney } from "@/lib/format";

export function ServiceCard({ service, basePath }: { service: Service; basePath: string }) {
  return (
    <Link
      href={`${basePath}/${service.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
    >
      <span aria-hidden="true" className="mb-4 h-1.5 w-10 rounded-full bg-accent-500" />
      <h3 className="text-lg font-semibold text-brand-900 group-hover:text-brand-700">{service.name}</h3>
      {service.summary && <p className="mt-2 flex-1 text-muted">{service.summary}</p>}
      <span className="mt-4 text-sm font-semibold text-brand-700">
        Learn more <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/academy/${course.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {course.is_signature && <Badge tone="accent">Signature course</Badge>}
        <Badge>{certificationLabel(course.certification_type)}</Badge>
      </div>
      <h3 className="text-lg font-semibold text-brand-900 group-hover:text-brand-700">{course.title}</h3>
      {course.summary && <p className="mt-2 flex-1 text-muted">{course.summary}</p>}
      <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {course.duration_text && (
          <div>
            <dt className="sr-only">Duration</dt>
            <dd>{course.duration_text}</dd>
          </div>
        )}
        {course.fee_amount != null && (
          <div>
            <dt className="sr-only">Fee</dt>
            <dd>{formatMoney(course.fee_amount, course.fee_currency)}</dd>
          </div>
        )}
      </dl>
    </Link>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {post.category && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-600">{post.category.name}</p>}
      <h3 className="text-lg font-semibold text-brand-900 group-hover:text-brand-700">{post.title}</h3>
      {post.excerpt && <p className="mt-2 flex-1 text-muted">{post.excerpt}</p>}
      {post.published_at && (
        <time dateTime={post.published_at} className="mt-4 text-sm text-muted">
          {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.published_at))}
        </time>
      )}
    </Link>
  );
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
      <div aria-hidden="true" className="mb-4 flex aspect-[4/3] items-center justify-center rounded-xl bg-brand-50 font-display text-3xl font-bold tracking-[0.2em] text-brand-300">
        CHASE
      </div>
      <h3 className="text-lg font-semibold text-brand-900">{product.name}</h3>
      {product.description && <p className="mt-2 flex-1 text-muted">{product.description}</p>}
      <p className="mt-4 font-semibold text-brand-800">
        {product.price_amount != null ? formatMoney(product.price_amount, product.price_currency) : "Price on request"}
      </p>
      {!product.is_available && <p className="mt-1 text-sm text-muted">Currently unavailable</p>}
    </div>
  );
}
