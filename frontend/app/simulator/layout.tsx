import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World Cup 2026 Bracket Simulator',
  description:
    'Simulate the entire FIFA World Cup 2026 tournament. Pick your group winners, simulate knockouts and predict the champion. Share your bracket with friends.',
  keywords: [
    'world cup 2026 bracket',
    'world cup 2026 simulator',
    'world cup 2026 bracket predictor',
    'fifa world cup 2026 bracket',
    'world cup 2026 predictions bracket',
    'simulate world cup 2026',
  ],
  openGraph: {
    title: 'World Cup 2026 Bracket Simulator | FanXI',
    description:
      'Simulate the FIFA World Cup 2026. Pick winners, predict upsets, share your bracket.',
    url: 'https://fanxi.vercel.app/simulator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'World Cup 2026 Bracket Simulator | FanXI',
    description:
      'Simulate the FIFA World Cup 2026. Pick winners, predict upsets, share your bracket.',
  },
  alternates: { canonical: '/simulator' },
};

export default function SimulatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
