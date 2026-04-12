import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

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

// Slug to display name fallback
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface Props {
  params: Promise<{ team: string }>;
}

export async function generateStaticParams() {
  return WC2026_SLUGS.map(slug => ({ team: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { team: slug } = await params;
  const displayName = slugToName(slug);

  // Try to fetch SEO data from API at build time
  let seoTitle = `${displayName} World Cup 2026 — Squad, Predictions & Tactical Analysis | FanXI`;
  let metaDesc = `Predict ${displayName}'s starting XI for FIFA World Cup 2026. Tactical analysis, squad depth and formation predictions.`;
  let keywords: string[] = [
    `${displayName} world cup 2026`,
    `${displayName} world cup 2026 squad`,
    `${displayName} world cup 2026 prediction`,
  ];

  try {
    const res = await fetch(`${API}/nations/${slug}`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const data = await res.json();
      if (data.seo) {
        seoTitle = data.seo.seo_title || seoTitle;
        metaDesc = data.seo.meta_description || metaDesc;
        keywords = data.seo.keywords || keywords;
      }
    }
  } catch {
    // Use fallback metadata
  }

  return {
    title: seoTitle,
    description: metaDesc,
    keywords: keywords.join(', '),
    openGraph: {
      title: seoTitle,
      description: metaDesc,
      url: `/nations/${slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: metaDesc,
    },
    alternates: { canonical: `/nations/${slug}` },
  };
}

export default function NationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
