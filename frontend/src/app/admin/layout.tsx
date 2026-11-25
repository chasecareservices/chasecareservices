import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Staff dashboard", template: "%s | Chase Care staff dashboard" },
  robots: { index: false, follow: false },
};

/** The staff dashboard never uses cached pages. */
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 text-ink">{children}</div>;
}
