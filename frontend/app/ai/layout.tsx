import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Scout',
  description: 'Chat with an AI tactical scout powered by Llama 3.3. Ask about any World Cup 2026 team, formation, player, or tactical situation.',
  openGraph: {
    title: 'AI Scout | FanXI',
    description: 'Your AI-powered tactical scout for World Cup 2026.',
    url: '/ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Scout | FanXI',
    description: 'Your AI-powered tactical scout for World Cup 2026.',
  },
  alternates: { canonical: '/ai' },
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
