import { AuthCard } from "@/components/admin/AuthCard";
import { signOutWorker } from "@/app/portal/actions";

export default function PortalNoAccessPage() {
  return (
    <AuthCard
      subtitle="Care worker portal"
      title="This account can't send reports yet"
      intro="You're signed in, but this account isn't set up as a care worker, or it has been switched off. Please call the Chase Care office."
    >
      <form action={signOutWorker}>
        <button type="submit" className="min-h-12 w-full rounded-full border-2 border-brand-800 font-semibold text-brand-800 hover:bg-brand-50">
          Sign out
        </button>
      </form>
    </AuthCard>
  );
}
