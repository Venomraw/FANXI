import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome',
  description: 'Set up your FanXI profile, pick your nation, and start building your World Cup 2026 lineup.',
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
