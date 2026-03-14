import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.si.com' },
      { protocol: 'https', hostname: 'images.psg.fr' },
      { protocol: 'https', hostname: 'img.a.transfermarkt.technology' },
      { protocol: 'https', hostname: 'fcb-abj-pre.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/commons/**' },
    ],
  },
};

export default nextConfig;