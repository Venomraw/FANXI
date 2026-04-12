import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let champion = 'Unknown';
  let finalist = 'Unknown';
  let displayName = '';

  try {
    const res = await fetch(`${API}/simulator/share/${id}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      champion = data.champion ?? 'Unknown';
      finalist = data.finalist ?? 'Unknown';
      displayName = data.display_name ?? '';
    }
  } catch {
    // Fall back to defaults
  }

  const title = displayName
    ? `${displayName}'s WC2026 Bracket — ${champion} wins it all | FanXI`
    : `WC2026 Bracket — ${champion} wins it all | FanXI`;

  const description = `${champion} beats ${finalist} in the final. See the full bracket and build your own at FanXI.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://fanxi.vercel.app/simulator/share/${id}`,
      type: 'website',
      images: [{
        url: `/simulator/share/${id}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${champion} wins the World Cup 2026`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/simulator/share/${id}/opengraph-image`],
    },
  };
}

export default function SharedBracketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
