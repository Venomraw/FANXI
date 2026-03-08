import type { MetadataRoute } from 'next';

const BASE_URL = 'https://fanxi.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                        lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/matches`,           lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE_URL}/predict`,           lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/leaderboard`,       lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${BASE_URL}/nation`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/ai`,                lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/guide`,             lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/login`,             lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  return staticRoutes;
}
