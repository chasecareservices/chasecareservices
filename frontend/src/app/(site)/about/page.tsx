import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HighlightBox } from "@/components/HighlightBox";
import { ImpactStats, RecognitionList } from "@/components/Impact";
import { RelatedInfo } from "@/components/RelatedInfo";
import { BandHero, CheckList, Container, EmptyState } from "@/components/ui";
import { getPartners, getTeamMembers, mediaUrl, type TeamMember, bannerFor } from "@/lib/content";
import { MISSION, MISSION_POINTS, VALUES, VISION, WHAT_WE_DO, CHASE_MEANING } from "@/lib/site-copy";
import { ABOUT_TEAM_STRIP } from "@/lib/images";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About Us",
  description: "Who we are, our vision and mission, our values, leadership and partners.",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function PersonCard({ person }: { person: TeamMember }) {
  const photo = mediaUrl(person.photo_path);
  return (
    <article className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
      {photo ? (
        <Image src={photo} alt={person.full_name} width={160} height={160} className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700"
        >
          {initials(person.full_name)}
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold text-brand-900">{person.full_name}</h3>
      {person.position && <p className="text-sm font-medium text-accent-700">{person.position}</p>}
      {person.bio && <p className="mt-3 text-sm leading-relaxed text-muted">{person.bio}</p>}
    </article>
  );
}

export default async function AboutPage() {
  const [board, team, partners] = await Promise.all([getTeamMembers("board"), getTeamMembers("team"), getPartners()]);

  return (
    <>
      <BandHero eyebrow="About Us" title="Who We Are" image={await bannerFor("about")} people={ABOUT_TEAM_STRIP} />
      <ImpactStats />

      <Container className="grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="max-w-3xl space-y-14 text-[1.0625rem] leading-relaxed text-ink">
          <section id="who-we-are" className="scroll-mt-32 space-y-5">
            <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">One mission: quality care for every family</h2>
            <p>
              Chase Care Services is a Ghana-based care and support organisation. We provide person-centred care, professional
              support, training, respite and wellbeing services for individuals, families, carers and healthcare professionals —
              in Ghana, and for Ghanaian families around the world who need trusted care for a loved one at home.
            </p>
            <p>
              Every person we support arrives with their own needs, their own family and their own story. Caring for each of
              them as an individual — with compassion, dignity and skill — is the mission we were built on.
            </p>

            <div className="rounded-2xl border border-brand-100 p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">What CHASE stands for</p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xl font-bold text-brand-900">
                {CHASE_MEANING.map((word) => (
                  <span key={word}>
                    <span className="text-accent-600">{word[0]}</span>
                    {word.slice(1)}
                  </span>
                ))}
              </p>
              <p className="mt-3 text-muted">
                We do not simply provide care: we build trust, preserve dignity and empower lives.{" "}
                <Link href="/about/how-we-care" className="font-medium text-brand-700 underline underline-offset-2">
                  Read how we care
                </Link>
                .
              </p>
            </div>

            <h3 className="pt-4 text-2xl font-bold text-brand-900">What we do</h3>
            <HighlightBox intro="Our teams deliver care, training and support that share a single purpose:" items={WHAT_WE_DO} />
          </section>

          <section id="who-we-are-today" className="scroll-mt-32 space-y-5">
            <h2 className="text-2xl font-bold text-brand-900">Who we are today</h2>
            <p>
              We are building more than a care agency: an integrated care ecosystem around three pillars —{" "}
              <strong className="text-brand-900">Care</strong> for individuals and families,{" "}
              <strong className="text-brand-900">Careers</strong> for caregivers and healthcare professionals, and{" "}
              <strong className="text-brand-900">Community</strong> through wellbeing, inclusion, education and partnership.
            </p>
            <p>
              Our promise is simple: no placement without appropriate preparation. Every caregiver is screened, trained and
              assessed before they support a client, and supported throughout their work with us through our{" "}
              <Link href="/wellbeing" className="font-medium text-brand-700 underline underline-offset-2">
                Wellbeing Hub
              </Link>
              .
            </p>
            <p>
              We work in partnership with families, schools, hospitals, community organisations and healthcare partners, because
              the best care is built together.
            </p>
          </section>

          <section id="vision-and-mission" className="scroll-mt-32 space-y-6">
            <h2 className="text-2xl font-bold text-brand-900">Vision &amp; mission</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">Our vision</p>
                <p className="mt-2 text-brand-900">{VISION}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-widest text-accent-700">Our mission</p>
                <p className="mt-2 text-brand-900">{MISSION}</p>
              </div>
            </div>
            <CheckList items={MISSION_POINTS} columns={1} />
          </section>

          <section id="our-values" className="scroll-mt-32 space-y-5">
            <h2 className="text-2xl font-bold text-brand-900">Our values</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {VALUES.map((v) => (
                <div key={v.name} className="border-l-4 border-accent-500 pl-4">
                  <dt className="font-semibold text-brand-900">{v.name}</dt>
                  <dd className="mt-1 text-[0.9375rem] text-muted">{v.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <RecognitionList />

          <section id="board" className="scroll-mt-32 space-y-5">
            <h2 className="text-2xl font-bold text-brand-900">The people leading the organisation</h2>
            {board.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {board.map((p) => (
                  <PersonCard key={p.id} person={p} />
                ))}
              </div>
            ) : (
              <EmptyState title="Board profiles coming soon" />
            )}
          </section>

          {team.length > 0 && (
            <section id="team" className="scroll-mt-32 space-y-5">
              <h2 className="text-2xl font-bold text-brand-900">Our team</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {team.map((p) => (
                  <PersonCard key={p.id} person={p} />
                ))}
              </div>
            </section>
          )}

          <section id="partners" className="scroll-mt-32 space-y-5">
            <h2 className="text-2xl font-bold text-brand-900">Our partners</h2>
            {partners.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-3">
                {partners.map((p) => {
                  const logo = mediaUrl(p.logo_path);
                  return (
                    <li key={p.id} className="flex min-h-24 items-center justify-center rounded-2xl border border-brand-100 p-4 text-center">
                      {logo ? (
                        <Image src={logo} alt={p.name} width={160} height={80} className="h-14 w-auto object-contain" />
                      ) : (
                        <span className="font-semibold text-brand-900">{p.name}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="Partner information coming soon">
                We work with healthcare providers, laboratories, insurers, schools, hospitals and community organisations.
              </EmptyState>
            )}
          </section>

          <p className="border-t border-brand-100 pt-8 text-xl italic text-brand-800">
            Quality Care. Compassionate Support. Empowered Lives.
          </p>
        </div>

        <aside className="lg:sticky lg:top-32 lg:h-fit">
          <RelatedInfo pathname="/about" />
        </aside>
      </Container>
    </>
  );
}
