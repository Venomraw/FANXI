import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Bypasses the 500/404 processing errors for dev
    remotePatterns: [
      { protocol: 'https', hostname: 'images.si.com' },
      { protocol: 'https', hostname: 'images.psg.fr' },
      { protocol: 'https', hostname: 'img.a.transfermarkt.technology' },
      { protocol: 'https', hostname: 'fcb-abj-pre.s3.amazonaws.com' }, // Adding a high-availability source
    ],
  },
};

export default nextConfig;