'use client';

import { useEffect, useState } from 'react';

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  tacticalAngle: string;
}

const STATIC_FALLBACK: NewsArticle[] = [
  {
    title: 'FIFA confirms 48-team format for 2026 World Cup',
    description: 'The expanded format introduces three-team groups in the opening round.',
    url: 'https://www.fifa.com',
    source: 'FIFA',
    publishedAt: new Date().toISOString(),
    tacticalAngle: 'Three-team groups demand tactical flexibility from all managers.',
  },
  {
    title: 'USA, Canada, Mexico prepare historic joint hosting bid',
    description: 'Three nations will co-host the first 48-team World Cup across 16 cities.',
    url: 'https://www.espn.com',
    source: 'ESPN',
    publishedAt: new Date().toISOString(),
    tacticalAngle: 'Three-nation hosting creates unique logistical challenges for squad rotation and travel.',
  },
  {
    title: 'European qualifying heats up for 2026 spots',
    description: "UEFA's expanded allocation means more European teams will feature in 2026.",
    url: 'https://www.uefa.com',
    source: 'UEFA',
    publishedAt: new Date().toISOString(),
    tacticalAngle: "UEFA's expanded allocation means more tactical diversity in the tournament.",
  },
  {
    title: "Mbappé targets back-to-back World Cups with France",
    description: "Kylian Mbappé remains France's focal point ahead of 2026.",
    url: 'https://www.lequipe.fr',
    source: "L'Equipe",
    publishedAt: new Date().toISOString(),
    tacticalAngle: "If Mbappé leads France's press, opponents must prepare for explosive counter-attacks.",
  },
];

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex justify-between mb-3">
        <div className="h-3 rounded w-16" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-3 rounded w-10" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div className="h-4 rounded mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-4 rounded mb-4 w-4/5" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-3 rounded mb-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-3 rounded w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

export default function NewsStrip() {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    fetch(`${apiUrl}/news/wc2026`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed');
        return r.json() as Promise<NewsArticle[]>;
      })
      .then((data) => {
        setArticles(data.slice(0, 4));
        setLoading(false);
      })
      .catch(() => {
        setArticles(STATIC_FALLBACK);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const displayed = articles ?? STATIC_FALLBACK;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {displayed.map((article, i) => (
        <a
          key={i}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl p-5 group transition-all duration-300"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.4)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          {/* Source + time */}
          <div className="flex justify-between items-center mb-3">
            <span
              className="font-mono text-white/50 uppercase"
              style={{ fontSize: '10px', letterSpacing: '1px' }}
            >
              {article.source}
            </span>
            <span className="font-mono text-white/60" style={{ fontSize: '10px' }}>
              {timeAgo(article.publishedAt)}
            </span>
          </div>

          {/* Headline */}
          <h4
            className="font-sans text-white font-semibold mb-3 line-clamp-2"
            style={{ fontSize: '14px', lineHeight: 1.4 }}
          >
            {article.title}
          </h4>

          {/* AI tactical angle */}
          <p
            className="font-display mb-4 line-clamp-2"
            style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#dc2626',
              fontStyle: 'italic',
            }}
          >
            {article.tacticalAngle}
          </p>

          {/* Read more */}
          <div
            className="font-mono text-white/40 group-hover:text-white/70 transition-colors"
            style={{ fontSize: '11px', letterSpacing: '0.5px' }}
          >
            Read More →
          </div>
        </a>
      ))}
    </div>
  );
}
