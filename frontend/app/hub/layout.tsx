import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hub',
  description: 'Your personal World Cup 2026 tactical dashboard. Track predictions, stats, and leaderboard rank.',
  robots: { index: false, follow: false },
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
