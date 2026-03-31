import type { Metadata } from 'next';

interface Props {
  params: Promise<{ matchId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchId } = await params;
  return {
    title: `Match #${matchId} — Live`,
    description: `Live tactical view and real-time updates for World Cup 2026 match #${matchId}.`,
    openGraph: {
      title: `Live Match #${matchId} | FanXI`,
      description: `Real-time lineup and match updates for World Cup 2026 match #${matchId}.`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Live Match #${matchId} | FanXI`,
      description: `Real-time lineup and match updates for World Cup 2026 match #${matchId}.`,
    },
    robots: { index: false, follow: false },
  };
}

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
