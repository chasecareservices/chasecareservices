"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/admin/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export default function FamilyLoginPage() {
  return (
    <AuthCard subtitle="Family portal" title="Sign in to follow your loved one's care" intro="Use the email and password from your Chase Care invitation.">
      <Suspense>
        <LoginForm home="/family" />
      </Suspense>
    </AuthCard>
  );
}
