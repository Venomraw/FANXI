import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Build Your XI',
  description: 'Build your predicted starting XI for any World Cup 2026 match. Drag players to positions, set your formation, and lock in your lineup before kickoff.',
  openGraph: {
    title: 'Build Your XI | FanXI',
    description: 'Predict the lineup. Set your formation. Prove your tactical IQ.',
  },
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
