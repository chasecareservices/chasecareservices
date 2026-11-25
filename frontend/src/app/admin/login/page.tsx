"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/admin/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthCard title="Sign in" intro="For Chase Care Services staff only.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
