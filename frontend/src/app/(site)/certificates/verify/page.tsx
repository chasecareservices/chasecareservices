import type { Metadata } from "next";
import { Container, PageHero } from "@/components/ui";
import { CERT_TYPE_LABEL, certificationLine, formatHours } from "@/lib/learning";
import { getLiveServerClient } from "@/lib/supabase/client";

export const metadata: Metadata = {
  title: "Check a certificate",
  description: "Check that a ChaseCare Academy certificate is genuine, using the code printed on it.",
};
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const clean = (code ?? "").trim().toUpperCase().slice(0, 40);
  const supabase = clean ? getLiveServerClient() : null;
  const { data } = supabase ? await supabase.rpc("verify_certificate", { code: clean }) : { data: null };
  const c = data?.[0];

  return (
    <>
      <PageHero eyebrow="ChaseCare Academy" title="Check a certificate" intro="Employers and partners can confirm a ChaseCare Academy certificate is genuine using the code printed at the bottom of it." />
      <Container className="max-w-2xl py-12">
        <form action="/certificates/verify" className="flex flex-wrap items-end gap-3">
          <label htmlFor="code" className="flex-1 text-sm font-semibold text-brand-900">
            Certificate code or number
            <input
              id="code"
              name="code"
              defaultValue={clean}
              required
              maxLength={40}
              autoComplete="off"
              placeholder="e.g. 7F3A9C21B4 or CCS-2026-00012"
              className="mt-1 block w-full rounded-xl border border-brand-200 px-4 py-3 text-base uppercase"
            />
          </label>
          <button type="submit" className="min-h-12 rounded-full bg-brand-800 px-6 font-semibold text-white hover:bg-brand-700">
            Check
          </button>
        </form>

        {clean && (
          <div role="status" className="mt-8">
            {!c ? (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-red-950">
                <p className="text-lg font-bold">No certificate found</p>
                <p>Check the code and try again. If it still isn&apos;t found, the certificate may not be genuine: contact us.</p>
              </div>
            ) : c.revoked ? (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-red-950">
                <p className="text-lg font-bold">This certificate ({c.number}) has been revoked</p>
                <p>It is no longer valid. Please contact the ChaseCare Academy for details.</p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6">
                <p className="text-lg font-bold text-green-900">✓ Genuine ChaseCare Academy certificate</p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Awarded to", c.learner_name],
                    ["Course", c.course_title],
                    ["Type", `${CERT_TYPE_LABEL[c.certification_type]}${c.certification_type === "externally_accredited" ? ` (${certificationLine(c.certification_type, c.accrediting_body)})` : ""}`],
                    ["Completed", new Date(`${c.completed_on}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })],
                    ...(c.cpd_hours ? [["CPD hours", formatHours(Number(c.cpd_hours))]] : []),
                    ["Certificate number", c.number],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-sm text-muted">{k}</dt>
                      <dd className="font-semibold text-brand-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}
      </Container>
    </>
  );
}
