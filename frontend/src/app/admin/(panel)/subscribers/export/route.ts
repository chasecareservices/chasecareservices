import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/session";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote everything; stop spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** Confirmed subscribers as a CSV file. */
export async function GET() {
  const staff = await requirePermission("communications.export");
  const { data } = await staff.supabase
    .from("newsletter_subscribers")
    .select("email, full_name, status, confirmed_at, created_at")
    .eq("status", "subscribed")
    .order("created_at");
  const rows = [["Email", "Name", "Status", "Confirmed", "Signed up"], ...(data ?? []).map((r) => [r.email, r.full_name, r.status, r.confirmed_at, r.created_at])];
  return new NextResponse(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chase-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
