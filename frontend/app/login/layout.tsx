import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to FanXI to build your predicted XI and compete on the global tactical leaderboard.',
  openGraph: {
    title: 'Sign In | FanXI',
    description: 'Sign in to build your predicted XI and compete on the global tactical leaderboard.',
  },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
