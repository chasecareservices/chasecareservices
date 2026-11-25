import Image from "next/image";
import Link from "next/link";
import { CourseCard, ServiceCard } from "@/components/cards";
import { toBlocks } from "@/components/PageBlocks";
import { ButtonLink, CheckList, Container, Pathway, Section } from "@/components/ui";
import { getCourses, getPage, getServices, getTestimonials } from "@/lib/content";
import { formatLongDate, nextForumDate } from "@/lib/forum";
import { STUDENT_PATHWAY, WHY_CHOOSE_US } from "@/lib/site-copy";

export const revalidate = 300;

type HeroData = { heading?: string; text?: string; note?: string; buttons?: { label: string; href: string }[] };

const DEFAULT_HERO: Required<HeroData> = {
  heading: "Quality Care. Compassionate Support. Empowered Lives.",
  text: "Professional, person-centred care and support for individuals and families in Ghana and across the diaspora.",
  note: "Supporting families in Ghana and families around the world who need trusted care for their loved ones in Ghana.",
  buttons: [
    { label: "Find a Care Service", href: "/care-services" },
    { label: "Join Our Team", href: "/join-our-team" },
    { label: "Explore Our Training", href: "/academy" },
  ],
};

export default async function HomePage() {
  const [homePage, services, courses, testimonials] = await Promise.all([
    getPage("home"),
    getServices("care"),
    getCourses(),
    getTestimonials(),
  ]);

  // Use the hero the owner edited in the dashboard once the Home page is published.
  const heroBlock = toBlocks(homePage?.body).find((b) => b.type === "hero" && b.visible !== false);
  const heroData = (heroBlock?.data ?? {}) as HeroData;
  const hero = {
    heading: heroData.heading || DEFAULT_HERO.heading,
    text: heroData.text || DEFAULT_HERO.text,
    note: heroData.note || DEFAULT_HERO.note,
    buttons: heroData.buttons?.length ? heroData.buttons : DEFAULT_HERO.buttons,
  };

  const featuredServices = services.slice(0, 8);
  const featuredCourses = [...courses].sort((a, b) => Number(b.is_signature) - Number(a.is_signature)).slice(0, 3);
  const forumDate = nextForumDate();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        <Container className="relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent-400">Chase Care Services · Ghana</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{hero.heading}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100">{hero.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hero.buttons.map((b, i) => (
                <ButtonLink key={b.href} href={b.href} variant={i === 0 ? "primary" : "light"}>
                  {b.label}
                </ButtonLink>
              ))}
            </div>
            <p className="mt-8 max-w-xl border-l-4 border-accent-500 pl-4 text-brand-100">{hero.note}</p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div aria-hidden="true" className="absolute -inset-3 rotate-3 rounded-[2rem] bg-accent-500/80" />
            <Image
              src="/brand/chase-care-hero.jpg"
              alt="A Chase Care Services caregiver checking on an elderly client"
              width={640}
              height={640}
              priority
              className="relative h-auto w-full rounded-[2rem] shadow-2xl"
            />
          </div>
        </Container>
      </section>

      {/* Who we are */}
      <Section eyebrow="Who we are" title="A trusted, person-centred care organisation in Ghana">
        <div className="grid gap-8 lg:grid-cols-2">
          <p className="text-lg leading-relaxed text-muted">
            Chase Care Services provides person-centred care, professional support, training, respite services, community
            engagement and wellbeing services for individuals, families, carers and healthcare professionals — in Ghana and for
            Ghanaian families around the world.
          </p>
          <div className="flex flex-col items-start gap-4">
            <p className="text-lg leading-relaxed text-muted">
              We connect people with quality care, equip care professionals with the right skills and support, and help families
              access dependable care wherever they are.
            </p>
            <ButtonLink href="/about" variant="outline">
              Read more about us
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* What we do */}
      <Section tone="tint" eyebrow="What we do" title="Care services for every stage of life">
        {featuredServices.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredServices.map((s) => (
              <ServiceCard key={s.id} service={s} basePath="/care-services" />
            ))}
          </div>
        ) : null}
        <div className="mt-8">
          <ButtonLink href="/care-services" variant="secondary">
            See all care services
          </ButtonLink>
        </div>
      </Section>

      {/* Diaspora */}
      <Section tone="brand" eyebrow="Care from anywhere in the world" title="Your loved one is in Ghana. You are thousands of miles away.">
        <div className="grid gap-8 lg:grid-cols-2">
          <p className="text-lg leading-relaxed text-brand-100">
            Chase Care Services helps families abroad stay connected to their loved one&apos;s care through trusted, professional
            services and regular communication — from elderly care and disability support to hospital support, welfare visits and
            full care coordination.
          </p>
          <div className="flex flex-col items-start gap-4">
            <CheckList
              items={["Parent and elderly care", "Welfare visits", "Hospital support", "Care coordination"]}
              columns={2}
            />
            <ButtonLink href="/diaspora">I Live Abroad — Arrange Care in Ghana</ButtonLink>
          </div>
        </div>
      </Section>

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
      <Section
        tone="tint"
        eyebrow="ChaseCare Academy"
        title="Training and professional development in care"
        intro="Competency-based training, CPD and our signature Care Beyond Care course — plus a structured route into care for young people."
      >
        {featuredCourses.length > 0 && (
          <div className="mb-10 grid gap-5 md:grid-cols-3">
            {featuredCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
        <h3 className="mb-4 text-xl font-semibold text-brand-900">Start your career in care</h3>
        <Pathway steps={STUDENT_PATHWAY} />
        <div className="mt-8">
          <ButtonLink href="/academy" variant="secondary">
            Explore the Academy
          </ButtonLink>
        </div>
      </Section>

      {/* Wellbeing + Forum */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-brand-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">Wellbeing Hub</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900">Supporting the people who provide care</h2>
            <p className="mt-3 text-muted">
              Counselling, health and laboratory referrals, insurance information and wellbeing resources for our workforce.
            </p>
            <Link href="/wellbeing" className="mt-5 inline-block font-semibold text-brand-700 underline underline-offset-4">
              Visit the Wellbeing Hub
            </Link>
          </div>
          <div className="rounded-3xl bg-accent-50 p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">Community & Monthly Forum</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900">Join us every third Thursday</h2>
            <p className="mt-3 text-muted">
              Next forum: <strong className="text-brand-900">{formatLongDate(forumDate)}</strong>. Open to families, carers,
              professionals and the community.
            </p>
            <Link href="/community/monthly-forum" className="mt-5 inline-block font-semibold text-brand-700 underline underline-offset-4">
              Register for the forum
            </Link>
          </div>
        </div>
      </Section>

      {/* Testimonials — only consented, published ones are ever returned by the database */}
      {testimonials.length > 0 && (
        <Section tone="tint" eyebrow="Stories" title="What families say">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 6).map((t) => (
              <figure key={t.id} className="rounded-2xl bg-white p-6 shadow-sm">
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
