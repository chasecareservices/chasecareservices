import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/cards";
import { ButtonLink, EmptyState, PageHero, Pathway, Section } from "@/components/ui";
import { getCourses } from "@/lib/content";
import { STUDENT_PATHWAY } from "@/lib/site-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ChaseCare Academy",
  description: "Care training, CPD and professional development — including our signature Care Beyond Care course.",
};

export default async function AcademyPage() {
  const courses = await getCourses();
  const signature = courses.filter((c) => c.is_signature);
  const others = courses.filter((c) => !c.is_signature);

  return (
    <>
      <PageHero
        eyebrow="ChaseCare Academy"
        title="Training that prepares people to care well"
        intro="Competency-based training, continuous professional development and courses for parents and young people starting out in care."
        actions={
          <>
            <ButtonLink href="/contact?topic=course_registration">Register for a Course</ButtonLink>
            <ButtonLink href="/academy/workforce-standards" variant="light">
              Our workforce standards
            </ButtonLink>
          </>
        }
      />

      {signature.length > 0 && (
        <Section eyebrow="Signature course" title="Care Beyond Care">
          <div className="grid gap-5 md:grid-cols-2">
            {signature.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </Section>
      )}

      <Section tone="tint" title="Courses">
        {others.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState title="Course dates are being finalised">
            <Link href="/contact?topic=course_registration" className="font-semibold text-brand-700 underline">
              Register your interest
            </Link>{" "}
            and we&apos;ll let you know when the next intake opens.
          </EmptyState>
        )}
        <p className="mt-8 max-w-3xl text-sm text-muted">
          Certificates: we clearly distinguish Chase internal certificates, CPD courses and courses with recognised external
          accreditation. A course is only described as accredited when that accreditation has been obtained.
        </p>
      </Section>

      <Section
        eyebrow="Student / Young Caregiver Programme"
        title="Start Your Career in Care"
        intro="You don't have to wait years to begin building your career in care. We provide structured training and development for SHS graduates and young people who want to become professional caregivers and support workers."
      >
        <Pathway steps={STUDENT_PATHWAY} />
        <div className="mt-8">
          <ButtonLink href="/contact?topic=student_programme">Start Your Care Career</ButtonLink>
        </div>
      </Section>

      <Section tone="tint" eyebrow="Parent & Family Learning Centre" title="Training for parents">
        <p className="max-w-3xl text-lg text-muted">
          Understand special educational needs and disability: autism, communication, positive behaviour support, inclusive
          education, routines, emotional regulation and working with schools.
        </p>
        <div className="mt-6">
          <ButtonLink href="/parent-and-family-learning" variant="secondary">
            Explore Parent Training
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
