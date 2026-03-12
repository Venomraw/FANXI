import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hub — FanXI',
  description: 'Your personal World Cup 2026 tactical dashboard.',
  robots: { index: false, follow: false },
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
