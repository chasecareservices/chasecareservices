import { signOutLearner } from "@/app/learn/actions";
import { AuthCard } from "@/components/admin/AuthCard";

export default function LearnNoAccessPage() {
  return (
    <AuthCard
      subtitle="ChaseCare Academy"
      title="This account has no courses yet"
      intro="You're signed in, but this account isn't set up for online learning. Please contact the ChaseCare Academy to be enrolled."
    >
      <form action={signOutLearner}>
        <button type="submit" className="min-h-12 w-full rounded-full border-2 border-brand-800 font-semibold text-brand-800 hover:bg-brand-50">
          Sign out
        </button>
      </form>
    </AuthCard>
  );
}
