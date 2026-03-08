import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'See where you rank among the world\'s top football tacticians. Football IQ rankings, prediction accuracy, and global standings for World Cup 2026.',
  openGraph: {
    title: 'Leaderboard | FanXI',
    description: 'Who has the best football IQ? See the global tactical rankings.',
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
