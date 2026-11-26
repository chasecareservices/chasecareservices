import { logIncident } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, PageHeader } from "@/components/admin/ui";
import { IncidentFields } from "@/components/care/IncidentFields";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Log an incident" };

export default async function NewIncidentPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const staff = await requirePermission("care_ops.edit");
  const { data: clients } = await staff.supabase.from("care_clients").select("id, full_name").eq("is_active", true).order("full_name");
  return (
    <>
      <PageHeader title="Log an incident" intro="For an incident the office was told about by phone, by a family or by someone else." />
      <Card className="max-w-3xl">
        <ActionForm action={logIncident} submitLabel="Save incident">
          <IncidentFields clients={(clients ?? []).map((c) => ({ id: c.id, name: c.full_name }))} clientId={client} nowLocal={new Date().toISOString().slice(0, 16)} />
        </ActionForm>
      </Card>
    </>
  );
}
