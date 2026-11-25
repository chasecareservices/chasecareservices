import type { Metadata } from "next";
import Image from "next/image";
import { CheckList, EmptyState, PageHero, Section } from "@/components/ui";
import { getPartners, getTeamMembers, mediaUrl, type TeamMember } from "@/lib/content";
import { MISSION, MISSION_POINTS, VALUES, VISION } from "@/lib/site-copy";
import { PAGE_BANNERS } from "@/lib/images";

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
        <div aria-hidden="true" className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
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
      <PageHero
        image={PAGE_BANNERS["about"]}
        eyebrow="About Us"
        title="Caring for People. Supporting Families. Empowering Care Professionals."
        intro="Chase Care Services is a Ghana-based care and support organisation providing person-centred care, professional support, training, respite, community engagement and wellbeing services."
      />

      <Section id="who-we-are" eyebrow="Who we are" title="More than a care agency">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">
          We are building an integrated care ecosystem that connects clients and families, caregivers, healthcare professionals,
          training, worker wellbeing, respite services, community partnerships and the Ghanaian diaspora — around three pillars:
          <strong className="text-brand-900"> Care, Careers and Community</strong>.
        </p>
      </Section>

      <Section id="vision-and-mission" tone="tint">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">Our vision</p>
            <p className="mt-3 text-xl leading-relaxed text-brand-900">{VISION}</p>
          </div>
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-600">Our mission</p>
            <p className="mt-3 text-xl leading-relaxed text-brand-900">{MISSION}</p>
          </div>
        </div>
        <div className="mt-10">
          <CheckList items={MISSION_POINTS} />
        </div>
      </Section>

      <Section id="our-values" eyebrow="Our values" title="What guides everything we do">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.name} className="rounded-2xl border border-brand-100 p-5">
              <h3 className="font-semibold text-brand-900">{v.name}</h3>
              <p className="mt-2 text-sm text-muted">{v.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="board" tone="tint" eyebrow="Leadership" title="Board of Directors">
        {board.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {board.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="Board profiles coming soon" />
        )}
      </Section>

      {team.length > 0 && (
        <Section id="team" eyebrow="Our people" title="Our Team">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((p) => (
              <PersonCard key={p.id} person={p} />
            ))}
          </div>
        </Section>
      )}

      {partners.length > 0 && (
        <Section id="partners" eyebrow="Working together" title="Our Partners">
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {partners.map((p) => {
              const logo = mediaUrl(p.logo_path);
              return (
                <li key={p.id} className="flex flex-col items-center justify-center rounded-2xl border border-brand-100 p-6 text-center">
                  {logo ? (
                    <Image src={logo} alt={p.name} width={160} height={80} className="h-16 w-auto object-contain" />
                  ) : (
                    <span className="font-semibold text-brand-900">{p.name}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </>
  );
}
