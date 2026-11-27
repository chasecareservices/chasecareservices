import Link from "next/link";
import { createEvent } from "../actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { EventFields } from "@/components/admin/EventFields";
import { Card, PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";

export const metadata = { title: "Add an event" };

export default async function NewEventPage() {
  await requirePermission("community.create");
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/events" className="text-sm font-medium text-brand-700 underline">
          ← Events
        </Link>
      </p>
      <PageHeader title="Add an event" intro="Save as Draft while you prepare it, then choose Published to show it on the website." />
      <Card className="max-w-4xl">
        <ActionForm action={createEvent} submitLabel="Save event">
          <EventFields />
        </ActionForm>
      </Card>
    </>
  );
}
