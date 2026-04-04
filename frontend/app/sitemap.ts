import type { MetadataRoute } from 'next';

const BASE_URL = 'https://fanxi.vercel.app';

const WC2026_SLUGS = [
  'argentina', 'australia', 'belgium', 'bolivia', 'brazil',
  'cameroon', 'canada', 'chile', 'colombia', 'costa-rica',
  'croatia', 'dr-congo', 'ecuador', 'egypt', 'england',
  'france', 'germany', 'ghana', 'honduras', 'indonesia',
  'iran', 'iraq', 'italy', 'japan', 'mexico',
  'morocco', 'netherlands', 'new-zealand', 'nigeria', 'panama',
  'paraguay', 'peru', 'poland', 'portugal', 'qatar',
  'romania', 'saudi-arabia', 'senegal', 'serbia', 'south-africa',
  'south-korea', 'spain', 'switzerland', 'tunisia', 'turkey',
  'ukraine', 'uruguay', 'usa', 'venezuela',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                        lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/matches`,           lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE_URL}/predict`,           lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/leaderboard`,       lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${BASE_URL}/nation`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/ai`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/guide`,             lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/simulator`,          lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/login`,             lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const nationPages: MetadataRoute.Sitemap = WC2026_SLUGS.map(slug => ({
    url: `${BASE_URL}/nations/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...nationPages];
}
