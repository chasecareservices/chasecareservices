import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin/session";
import { TEMPLATES } from "@/lib/email/templates";

export const metadata = { title: "Email templates" };

export default async function TemplatesPage() {
  const staff = await requirePermission("communications.view");
  const { data } = await staff.supabase.from("email_templates").select("key, updated_at");
  const custom = new Map((data ?? []).map((t) => [t.key, t.updated_at]));
  return (
    <>
      <PageHeader title="Email templates" intro="Change the wording of the automatic emails the website sends. Anything you leave empty keeps the built-in wording." />
      <ul className="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200">
        {TEMPLATES.map((t) => (
          <li key={t.key} className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-brand-50">
            <span>
              <Link href={`/admin/communications/templates/${t.key}`} className="font-semibold text-brand-800 underline after:absolute after:inset-0">
                {t.name}
              </Link>
              <span className="block text-sm text-muted">{t.when}</span>
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${custom.has(t.key) ? "bg-accent-100 text-accent-900" : "bg-gray-100 text-gray-700"}`}>
              {custom.has(t.key) ? "Your wording" : "Built-in wording"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">Office alerts (new enquiries, incidents, wellbeing requests) keep fixed wording, so they never include private details by mistake.</p>
    </>
  );
}
