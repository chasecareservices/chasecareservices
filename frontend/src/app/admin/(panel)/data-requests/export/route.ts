import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/session";

/** Everything held about one email address, as a JSON file for an access request. */
export async function GET(request: Request) {
  const staff = await requirePermission("users.view");
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new NextResponse("Enter an email address.", { status: 400 });
  const { data, error } = await staff.supabase.rpc("person_data", { lookup: email });
  if (error || !data) return new NextResponse("The data couldn't be gathered.", { status: 500 });
  return new NextResponse(JSON.stringify({ provided_by: "Chase Care Services", ...(data as object) }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="chase-care-data-${email.replace(/[^a-z0-9]+/g, "-")}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
