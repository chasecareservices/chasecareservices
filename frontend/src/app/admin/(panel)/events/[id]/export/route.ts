import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/session";
import { attendLabel, registrationStatusLabel } from "@/lib/events";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** Everyone registered for an event, as a CSV file (for a sign-in sheet). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await requirePermission("community.export");
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const [{ data: e }, { data }] = await Promise.all([
    staff.supabase.from("community_events").select("slug").eq("id", id).maybeSingle(),
    staff.supabase.from("event_registrations").select("full_name, email, phone, organisation, attend_mode, needs, status, created_at").eq("event_id", id).order("full_name"),
  ]);
  if (!e) return new NextResponse("Not found", { status: 404 });
  const rows = [
    ["Name", "Email", "Phone", "Organisation", "Joining", "Notes", "Status", "Registered"],
    ...(data ?? []).map((r) => [r.full_name, r.email, r.phone, r.organisation, attendLabel(r.attend_mode), r.needs, registrationStatusLabel(r.status), r.created_at]),
  ];
  return new NextResponse(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
