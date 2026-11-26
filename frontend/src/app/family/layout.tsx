import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Family portal", template: "%s · Chase Care family portal" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#2e0a4d" };
export const dynamic = "force-dynamic";

export default function FamilyRoot({ children }: { children: React.ReactNode }) {
  return children;
}
