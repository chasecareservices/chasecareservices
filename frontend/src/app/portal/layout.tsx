import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Care worker portal", template: "%s · Chase Care worker portal" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#2e0a4d" };
export const dynamic = "force-dynamic";

export default function PortalRoot({ children }: { children: React.ReactNode }) {
  return children;
}
