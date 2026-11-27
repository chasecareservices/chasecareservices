"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/admin/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LearnLoginPage() {
  return (
    <AuthCard subtitle="ChaseCare Academy" title="Sign in to your courses" intro="Use the email and password from your ChaseCare Academy or Chase Care invitation.">
      <Suspense>
        <LoginForm home="/learn" />
      </Suspense>
    </AuthCard>
  );
}
