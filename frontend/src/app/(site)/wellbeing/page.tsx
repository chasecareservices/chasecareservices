import type { Metadata } from "next";
import { PageBlocks, toBlocks } from "@/components/PageBlocks";
import { ButtonLink, Container, PageHero } from "@/components/ui";
import {
  ResourceList,
  ServiceCards,
  UpcomingSessions,
} from "@/components/wellbeing/WellbeingLists";
import { bannerFor, getPage } from "@/lib/content";
import { getServerClient } from "@/lib/supabase/client";
import { splitResources } from "@/lib/wellbeing";

export const revalidate = 300;

const TITLE = "Supporting the people who provide care";
const INTRO =
  "Caring for others is demanding. The ChaseCare Wellbeing Hub makes sure our caregivers and care professionals are supported too.";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("wellbeing");
  return {
    title: page?.seo_title ?? "Wellbeing Hub",
    description:
      page?.seo_description ??
      page?.summary ??
      "Counselling, health and laboratory referrals, insurance information, health education and webinars for ChaseCare care workers.",
  };
}

const OFFERS = [
  {
    title: "Counselling & emotional support",
    text: "Talk to someone in confidence about stress, grief, burnout or anything on your mind.",
    icon: "M8 10h8M8 14h5M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z",
  },
  {
    title: "Health services & referrals",
    text: "Health checks and referrals to trusted clinics and professionals.",
    icon: "M12 5v14M5 12h14",
  },
  {
    title: "Partner laboratory services",
    text: "Referrals to partner laboratories for appropriate tests.",
    icon: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3",
  },
  {
    title: "Insurance & benefits",
    text: "Clear information about worker insurance benefits, and help with claims.",
    icon: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  },
  {
    title: "Health education & resources",
    text: "Practical guides on rest, stress, safe moving and handling, and looking after yourself.",
    icon: "M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM8 7h6",
  },
  {
    title: "Webinars & support sessions",
    text: "Regular sessions with professionals, and a space to share with other carers.",
    icon: "M3 6h18v11H3zM8 21h8M12 17v4",
  },
];

export default async function WellbeingPage() {
  const supabase = getServerClient();
  const none = Promise.resolve({ data: null });
  const [page, banner, { data: services }, { data: resources }] =
    await Promise.all([
      getPage("wellbeing"),
      bannerFor("wellbeing"),
      supabase
        ? supabase
            .from("wellbeing_services")
            .select(
              "id, name, kind, provider, description, benefit, how_to_access, location, phone, website_url",
            )
            .eq("status", "published")
            .eq("audience", "public")
            .order("sort_order")
        : none,
      supabase
        ? supabase
            .from("wellbeing_resources")
            .select("id, title, kind, summary, url, starts_at, place")
            .eq("status", "published")
            .eq("audience", "public")
            .order("sort_order")
        : none,
    ]);
  const { upcoming, library } = splitResources(resources ?? []);
  const blocks = page ? toBlocks(page.body) : [];

  return (
    <>
      <PageHero
        image={banner}
        eyebrow="Wellbeing Hub"
        title={page?.title ?? TITLE}
        intro={page?.summary ?? INTRO}
        actions={
          <>
            <ButtonLink href="/portal/wellbeing/ask">
              Care workers: ask for support
            </ButtonLink>
            <ButtonLink href="/register/worker" variant="light">
              Join our team
            </ButtonLink>
          </>
        }
      />

      <Container className="py-14">
        <h2 className="text-3xl font-bold text-brand-900">
          What the Wellbeing Hub offers
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {OFFERS.map((o) => (
            <li
              key={o.title}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-brand-800">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={o.icon} />
                </svg>
              </span>
              <h3 className="mt-4 text-lg font-bold text-brand-900">
                {o.title}
              </h3>
              <p className="mt-1 text-ink/80">{o.text}</p>
            </li>
          ))}
        </ul>
      </Container>

      <section aria-labelledby="how-h" className="bg-brand-50 py-14">
        <Container>
          <h2 id="how-h" className="text-3xl font-bold text-brand-900">
            How care workers get support
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              [
                "Sign in to your portal",
                "Open My ChaseCare and choose Wellbeing.",
              ],
              [
                "Ask in confidence",
                "Choose the kind of support and tell us a little. Only the wellbeing team reads it.",
              ],
              [
                "We get in touch",
                "By phone, WhatsApp, email or in person: whichever you prefer.",
              ],
            ].map(([t, d], i) => (
              <li
                key={t}
                className="rounded-2xl bg-white p-6 ring-1 ring-brand-100"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-800 font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-lg font-bold text-brand-900">{t}</h3>
                <p className="mt-1">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-ink/80">
            <strong className="text-brand-900">Confidential by design.</strong>{" "}
            Requests are never shared with clients or other staff, and asking
            for help never counts against anyone.
          </p>
        </Container>
      </section>

      {!!services?.length && (
        <section id="services" aria-labelledby="svc-h" className="scroll-mt-24">
          <Container className="py-14">
            <h2 id="svc-h" className="text-3xl font-bold text-brand-900">
              Services & partners
            </h2>
            <div className="mt-8">
              <ServiceCards services={services} />
            </div>
          </Container>
        </section>
      )}

      {(upcoming.length > 0 || library.length > 0) && (
        <section
          id="resources"
          aria-labelledby="res-h"
          className="scroll-mt-24"
        >
          <Container className="py-14">
            <h2 id="res-h" className="text-3xl font-bold text-brand-900">
              Webinars & resources
            </h2>
            {upcoming.length > 0 && (
              <div className="mt-8 max-w-3xl">
                <h3 className="mb-3 text-xl font-bold text-brand-900">
                  Coming up
                </h3>
                <UpcomingSessions rows={upcoming} />
              </div>
            )}
            {library.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-xl font-bold text-brand-900">
                  Read and watch
                </h3>
                <ResourceList rows={library} />
              </div>
            )}
          </Container>
        </section>
      )}

      {blocks.length > 0 && (
        <div className="py-6">
          <PageBlocks blocks={blocks} />
        </div>
      )}

      <Container className="pb-16">
        <div
          role="note"
          className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-red-950"
        >
          <p className="font-semibold">In an emergency</p>
          <p>
            If you or someone else is in danger, call{" "}
            <a href="tel:112" className="font-semibold underline">
              112
            </a>{" "}
            or go to the nearest hospital emergency department.
          </p>
        </div>
      </Container>
    </>
  );
}
