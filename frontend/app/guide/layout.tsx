import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Play',
  description: 'Learn how FanXI works. Pick a match, build your predicted starting XI, lock it in before kickoff, and climb the global tactical leaderboard.',
  openGraph: {
    title: 'How to Play | FanXI',
    description: 'Learn how to predict World Cup 2026 lineups and prove your tactical IQ.',
    url: '/guide',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Play | FanXI',
    description: 'Learn how to predict World Cup 2026 lineups and prove your tactical IQ.',
  },
  alternates: { canonical: '/guide' },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
