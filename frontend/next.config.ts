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
    ];
  },
};

export default nextConfig;
