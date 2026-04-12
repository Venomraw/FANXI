import type { Metadata } from 'next';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const displayName = decodeURIComponent(username);
  return {
    title: `${displayName}'s Profile`,
    description: `${displayName}'s World Cup 2026 predictions, Football IQ rank, and tactical history on FanXI.`,
    openGraph: {
      title: `${displayName} | FanXI`,
      description: `${displayName}'s World Cup 2026 predictions and tactical record.`,
      url: `/profile/${username}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | FanXI`,
      description: `${displayName}'s World Cup 2026 predictions and tactical record.`,
    },
    alternates: { canonical: `/profile/${username}` },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
