"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/admin/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export default function PortalLoginPage() {
  return (
    <AuthCard
      subtitle="Care worker portal"
      title="Sign in to send your reports"
      intro="Use the email and password from your Chase Care invitation."
    >
      <Suspense>
        <LoginForm home="/portal" />
      </Suspense>
    </AuthCard>
  );
}
