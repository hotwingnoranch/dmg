import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // InsForge storage CDN — covers both the project subdomain and the
      // OSS host. Avatars + pro photos are served from these.
      { protocol: "https", hostname: "**.insforge.site" },
      { protocol: "https", hostname: "**.insforge.app" },
    ],
  },
};

export default nextConfig;
