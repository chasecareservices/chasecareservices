import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin/session";
import { certificatePdf } from "@/lib/learn/certificate-pdf";

/** A learner's own certificate, or any certificate for Academy staff, as a PDF. */
export async function GET(request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  if (!/^CCS-\d{4}-\d{5,}$/.test(number)) return new NextResponse("Not found", { status: 404 });
  const session = await getSession();
  if (session.kind === "signed-out") return NextResponse.redirect(new URL(`/learn/login?next=/learn`, request.url));
  // Row Level Security: a learner reads only their own; Academy staff read all.
  const { data: c } = await session.supabase
    .from("certificates")
    .select("number, verify_code, learner_name, course_title, certification_type, accrediting_body, cpd_hours, completed_on, revoked_at")
    .eq("number", number)
    .maybeSingle();
  if (!c) return new NextResponse("Not found", { status: 404 });
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  const bytes = await certificatePdf(
    { ...c, cpd_hours: c.cpd_hours === null ? null : Number(c.cpd_hours), revoked: !!c.revoked_at },
    `${site}/certificates/verify`,
  );
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${c.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
