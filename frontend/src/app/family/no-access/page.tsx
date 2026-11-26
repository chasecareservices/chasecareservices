import { AuthCard } from "@/components/admin/AuthCard";
import { signOutFamily } from "@/app/family/actions";

export default function FamilyNoAccessPage() {
  return (
    <AuthCard
      subtitle="Family portal"
      title="This account isn't linked to anyone yet"
      intro="You're signed in, but the office hasn't given this account access to a family member's care, or access has been switched off. Please call the Chase Care office."
    >
      <form action={signOutFamily}>
        <button type="submit" className="min-h-12 w-full rounded-full border-2 border-brand-800 font-semibold text-brand-800 hover:bg-brand-50">
          Sign out
        </button>
      </form>
    </AuthCard>
  );
}
