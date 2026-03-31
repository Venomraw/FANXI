import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fixtures',
  description: 'Browse all 72 World Cup 2026 group stage fixtures. Filter by group, find upcoming matches, and lock in your tactical prediction before kickoff.',
  openGraph: {
    title: 'WC 2026 Fixtures | FanXI',
    description: 'All 72 World Cup 2026 group stage fixtures. Lock in your prediction before kickoff.',
    url: '/matches',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WC 2026 Fixtures | FanXI',
    description: 'All 72 World Cup 2026 group stage fixtures. Lock in your prediction before kickoff.',
  },
  alternates: { canonical: '/matches' },
};

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
