import { redirect } from "next/navigation";

/** The old combined page: clients and care workers now have their own tabs. */
export default async function OldClientsAndWorkersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = new URLSearchParams(await searchParams);
  redirect(params.get("saved") === "invited" ? `/admin/care-workers?${params}` : "/admin/clients");
}
