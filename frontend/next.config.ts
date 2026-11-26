import type { NextConfig } from "next";

// Allow next/image to load files from the Supabase storage bucket.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageHost = supabaseUrl ? new URL(supabaseUrl) : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Staff upload photos (up to 10 MB) through server actions.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  images: {
    remotePatterns: storageHost
      ? [
          {
            protocol: storageHost.protocol.replace(":", "") as "http" | "https",
            hostname: storageHost.hostname,
            port: storageHost.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The care worker portal may ask for the phone's location (to confirm visits).
        // Location stays blocked on every other page. Later rules override earlier ones.
        source: "/portal/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }],
      },
      {
        // The "I need care" form can use the phone's location to pin where care will happen.
        source: "/register/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }],
      },
    ];
  },
};

export default nextConfig;
