import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nation Intel',
  description: 'Deep tactical intel on every World Cup 2026 nation. Squads, fixtures, group standings, AI scout analysis, and community discussion.',
  openGraph: {
    title: 'Nation Intel | FanXI',
    description: 'Squad lists, fixtures, and AI tactical analysis for every World Cup 2026 team.',
  },
};

export default function NationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
