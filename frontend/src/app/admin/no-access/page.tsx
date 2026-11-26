import { AuthCard } from "@/components/admin/AuthCard";
import { signOut } from "@/app/admin/actions";

export default function NoAccessPage() {
  return (
    <AuthCard
      title="No dashboard access"
      intro="You're signed in, but this account doesn't have a staff role, or it has been deactivated. Please ask your Chase Care administrator."
    >
      <form action={signOut}>
        <button type="submit" className="w-full rounded-full border-2 border-brand-800 py-3 font-semibold text-brand-800 hover:bg-brand-50">
          Sign out
        </button>
      </form>
    </AuthCard>
  );
}
