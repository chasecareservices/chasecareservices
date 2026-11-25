import Link from "next/link";
import { CourseCard, ServiceCard } from "@/components/cards";
import { HeroSlider } from "@/components/HeroSlider";
import { ImpactStats } from "@/components/Impact";
import { toBlocks } from "@/components/PageBlocks";
import { FillPhoto } from "@/components/Photo";
import { ButtonLink, CheckList, Container, ImageFeature, Pathway, Section } from "@/components/ui";
import { getCourses, getPage, getServices, getTestimonials, mediaUrl } from "@/lib/content";
import { formatLongDate, nextForumDate } from "@/lib/forum";
import { HERO_SLIDES, SECTION_IMAGES, type HeroSlide } from "@/lib/images";
import { STUDENT_PATHWAY, WHY_CHOOSE_US } from "@/lib/site-copy";

export const revalidate = 300;

type CmsSlide = {
  image_path?: string;
  image_alt?: string;
  eyebrow?: string;
  heading?: string;
  text?: string;
  buttons?: { label: string; href: string }[];
};
type CmsHero = CmsSlide & { note?: string; slides?: CmsSlide[] };

/**
 * Slides come from the Home page's hero block once the owner publishes it in the
 * dashboard; any field left empty falls back to the built-in slide.
 */
function resolveSlides(hero: CmsHero | undefined): HeroSlide[] {
  if (!hero) return HERO_SLIDES;
  const toSlide = (cms: CmsSlide, fallback: HeroSlide): HeroSlide => ({
    image: cms.image_path ? { src: mediaUrl(cms.image_path), alt: cms.image_alt ?? "" } : fallback.image,
    eyebrow: cms.eyebrow ?? fallback.eyebrow,
    heading: cms.heading || fallback.heading,
    text: cms.text || fallback.text,
    buttons: cms.buttons?.length ? cms.buttons : fallback.buttons,
  });
  if (hero.slides?.length) return hero.slides.map((s, i) => toSlide(s, HERO_SLIDES[i % HERO_SLIDES.length]));
  // A single hero (no slides) overrides only the first slide.
  return [toSlide(hero, HERO_SLIDES[0]), ...HERO_SLIDES.slice(1)];
}

export default async function HomePage() {
  const [homePage, services, courses, testimonials] = await Promise.all([
    getPage("home"),
    getServices("care"),
    getCourses(),
    getTestimonials(),
  ]);

  const heroBlock = toBlocks(homePage?.body).find((b) => b.type === "hero" && b.visible !== false);
  const slides = resolveSlides(heroBlock?.data as CmsHero | undefined);
  const featuredServices = services.slice(0, 8);
  const featuredCourses = [...courses].sort((a, b) => Number(b.is_signature) - Number(a.is_signature)).slice(0, 3);
  const forumDate = nextForumDate();

  return (
    <>
      <HeroSlider slides={slides} />
      <ImpactStats tone="brand" />

      {/* Who we are */}
      <ImageFeature image={SECTION_IMAGES.whoWeAre} eyebrow="Who we are" title="A trusted, person-centred care organisation in Ghana">
        <p>
          Chase Care Services provides person-centred care, professional support, training, respite services, community
          engagement and wellbeing services for individuals, families, carers and healthcare professionals — in Ghana and for
          Ghanaian families around the world.
        </p>
        <p>
          We connect people with quality care, equip care professionals with the right skills and support, and help families
          access dependable care wherever they are.
        </p>
        <ButtonLink href="/about" variant="outline">
          Read more about us
        </ButtonLink>
      </ImageFeature>

      {/* What we do */}
      <Section tone="tint" eyebrow="What we do" title="Care services for every stage of life">
        {featuredServices.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredServices.map((s) => (
              <ServiceCard key={s.id} service={s} basePath="/care-services" />
            ))}
          </div>
        )}
        <div className="mt-8">
          <ButtonLink href="/care-services" variant="secondary">
            See all care services
          </ButtonLink>
        </div>
      </Section>

      {/* Diaspora */}
      <ImageFeature
        image={SECTION_IMAGES.diaspora}
        tone="brand"
        reverse
        variant={2}
        eyebrow="Care from anywhere in the world"
        title="Your loved one is in Ghana. You are thousands of miles away."
      >
        <p>
          Chase Care Services helps families abroad stay connected to their loved one&apos;s care through trusted, professional
          services and regular communication.
        </p>
        <CheckList items={["Parent and elderly care", "Welfare visits", "Hospital support", "Care coordination"]} columns={2} />
        <ButtonLink href="/diaspora">I Live Abroad — Arrange Care in Ghana</ButtonLink>
      </ImageFeature>

      {/* Why choose us */}
      <Section eyebrow="Why choose ChaseCare" title="Care you can trust">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {WHY_CHOOSE_US.map((item) => (
            <div key={item.title} className="rounded-2xl border border-brand-100 p-5">
              <h3 className="font-semibold text-brand-900">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Academy */}
      <ImageFeature
        image={SECTION_IMAGES.academy}
        tone="tint"
        variant={1}
        eyebrow="ChaseCare Academy"
        title="Training and professional development in care"
      >
        <p>
          Competency-based training, CPD and our signature Care Beyond Care course — plus a structured route into care for
          young people.
        </p>
        <ButtonLink href="/academy" variant="secondary">
          Explore the Academy
        </ButtonLink>
      </ImageFeature>
      {featuredCourses.length > 0 && (
        <Section tone="tint">
          <div className="grid gap-5 md:grid-cols-3">
            {featuredCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </Section>
      )}
      <Section title="Start your career in care">
        <Pathway steps={STUDENT_PATHWAY} />
      </Section>

      {/* Wellbeing + Forum */}
      <Section tone="tint">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              image: SECTION_IMAGES.wellbeing,
              eyebrow: "Wellbeing Hub",
              title: "Supporting the people who provide care",
              body: <>Counselling, health and laboratory referrals, insurance information and wellbeing resources for our workforce.</>,
              href: "/wellbeing",
              link: "Visit the Wellbeing Hub",
            },
            {
              image: SECTION_IMAGES.community,
              eyebrow: "Community & Monthly Forum",
              title: "Join us every third Thursday",
              body: (
                <>
                  Next forum: <strong className="text-brand-900">{formatLongDate(forumDate)}</strong>. Open to families, carers,
                  professionals and the community.
                </>
              ),
              href: "/community/monthly-forum",
              link: "Register for the forum",
            },
          ].map((card, i) => (
            <article key={card.href} className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="relative aspect-[16/9]">
                <FillPhoto image={card.image} sizes="(min-width: 1024px) 50vw, 100vw" variant={i + 2} />
              </div>
              <div className="p-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">{card.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-bold text-brand-900">{card.title}</h2>
                <p className="mt-3 text-muted">{card.body}</p>
                <Link href={card.href} className="mt-5 inline-block font-semibold text-brand-700 underline underline-offset-4">
                  {card.link}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Testimonials — only consented, published ones are ever returned by the database */}
      {testimonials.length > 0 && (
        <Section eyebrow="Stories" title="What families say">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 6).map((t) => (
              <figure key={t.id} className="rounded-2xl bg-brand-50 p-6">
                <blockquote className="text-lg leading-relaxed text-ink">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-brand-800">
                  {t.author_name}
                  {t.author_context && <span className="block font-normal text-muted">{t.author_context}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* Final CTAs */}
      <section className="bg-accent-500">
        <Container className="flex flex-col items-start justify-between gap-6 py-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-3xl font-bold text-brand-950">How can we help you today?</h2>
            <p className="mt-2 text-brand-900">Request care, arrange care from abroad, or start your career in care.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/register/client" variant="secondary">
              Request Care
            </ButtonLink>
            <ButtonLink href="/diaspora" variant="light">
              Arrange Care in Ghana
            </ButtonLink>
            <ButtonLink href="/join-our-team" variant="light">
              Join Our Team
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
