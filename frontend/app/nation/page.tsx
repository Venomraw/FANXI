'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Article {
  id?: string;
  title: string;
  url: string;
  published: string;
  thumbnail?: string;
  trail?: string;
  byline?: string;
  source?: string;
}

interface RedditPost {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  score: number;
  comments: number;
  thumbnail?: string;
  flair?: string;
  author: string;
  created: number;
  selftext?: string;
}

interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail?: string;
  published: string;
  description?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | number): string {
  const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatScore(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse ${className}`} style={{ background: 'var(--mid)' }} />;
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHead({ icon, label, sub, primary }: { icon: string; label: string; sub?: string; primary: string }) {
  return (
    <div className="flex items-end gap-3 mb-5">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="font-display text-3xl leading-none tracking-widest uppercase theme-transition"
          style={{ color: primary }}>{label}</h2>
        {sub && <p className="font-mono text-[11px] uppercase tracking-widest mt-1" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── News Card ──────────────────────────────────────────────────────────────────

function NewsCard({ article, primary }: { article: Article; primary: string }) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden border theme-transition hover:-translate-y-0.5 transition-all duration-200"
      style={{
        background: 'var(--dark3)',
        borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 12%, transparent)`)}>
      {article.thumbnail ? (
        <div className="h-36 overflow-hidden">
          <img src={article.thumbnail} alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center text-3xl"
          style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 12%, transparent), transparent)` }}>
          📰
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="text-[var(--text)] text-sm font-semibold leading-snug line-clamp-2">
          {article.title}
        </p>
        {article.trail && (
          <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--muted)' }}
            dangerouslySetInnerHTML={{ __html: article.trail }} />
        )}
        <div className="mt-auto flex items-center justify-between pt-2 border-t"
          style={{ borderColor: `color-mix(in srgb, ${primary} 8%, transparent)` }}>
          <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {article.byline || article.source || 'The Guardian'}
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>{timeAgo(article.published)}</span>
        </div>
      </div>
    </a>
  );
}

// ── Reddit Card ────────────────────────────────────────────────────────────────

function RedditCard({ post, primary }: { post: RedditPost; primary: string }) {
  return (
    <a href={post.url} target="_blank" rel="noopener noreferrer"
      className="group flex gap-3 p-4 border transition-all hover:-translate-y-0.5 duration-200 theme-transition"
      style={{
        background: 'var(--dark3)',
        borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 12%, transparent)`)}>

      {/* Score */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-10 pt-0.5">
        <span className="text-xs theme-transition" style={{ color: primary }}>▲</span>
        <span className="font-display text-xl leading-none theme-transition" style={{ color: primary }}>
          {formatScore(post.score)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[var(--text)] text-sm font-semibold leading-snug line-clamp-2">
          {post.title}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 theme-transition"
            style={{
              background: `color-mix(in srgb, ${primary} 15%, transparent)`,
              color: primary,
              border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`,
            }}>
            {post.subreddit}
          </span>
          {post.flair && (
            <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--muted)' }}>
              {post.flair}
            </span>
          )}
          <span className="font-mono text-[11px] ml-auto" style={{ color: 'var(--muted)' }}>
            💬 {formatScore(post.comments)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>u/{post.author}</span>
          <span style={{ color: 'var(--muted)' }}>·</span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{timeAgo(post.created)}</span>
        </div>
      </div>
    </a>
  );
}

// ── Video Card ─────────────────────────────────────────────────────────────────

function VideoCard({ video, primary }: { video: Video; primary: string }) {
  const ytUrl = `https://www.youtube.com/watch?v=${video.id}`;
  return (
    <a href={ytUrl} target="_blank" rel="noopener noreferrer"
      className="group flex-shrink-0 w-56 border overflow-hidden transition-all hover:-translate-y-0.5 duration-200 theme-transition"
      style={{
        background: 'var(--dark3)',
        borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 12%, transparent)`)}>
      <div className="relative h-32 overflow-hidden" style={{ background: 'var(--mid)' }}>
        {video.thumbnail && (
          <img src={video.thumbnail} alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{
              background: 'rgba(0,0,0,0.65)',
              border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)`,
            }}>
            <span className="text-white text-sm ml-0.5">▶</span>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-[var(--text)] text-xs font-semibold leading-snug line-clamp-2">{video.title}</p>
        <p className="font-mono text-[11px] mt-1 truncate theme-transition" style={{ color: primary }}>{video.channel}</p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{timeAgo(video.published)}</p>
      </div>
    </a>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function NationPage() {
  const { team, primary, setShowPicker } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [news,     setNews]     = useState<Article[]>([]);
  const [moreNews, setMoreNews] = useState<Article[]>([]);
  const [reddit,   setReddit]   = useState<RedditPost[]>([]);
  const [videos,   setVideos]   = useState<Video[]>([]);
  const [loading,  setLoading]  = useState({ news: true, reddit: true, videos: true });
  const [activeTab, setActiveTab] = useState<'news' | 'community' | 'videos'>('news');

  const teamName = team?.name ?? '';

  const fetchAll = useCallback(async () => {
    if (!teamName) return;
    const base = 'http://localhost:8000/intel';
    setLoading({ news: true, reddit: true, videos: true });

    await Promise.allSettled([
      fetch(`${base}/news/${encodeURIComponent(teamName)}`)
        .then(r => r.json())
        .then(d => setNews(d.articles ?? []))
        .finally(() => setLoading(p => ({ ...p, news: false }))),

      fetch(`${base}/more-news/${encodeURIComponent(teamName)}`)
        .then(r => r.json())
        .then(d => setMoreNews(d.articles ?? [])),

      fetch(`${base}/reddit/${encodeURIComponent(teamName)}`)
        .then(r => r.json())
        .then(d => setReddit(d.posts ?? []))
        .finally(() => setLoading(p => ({ ...p, reddit: false }))),

      fetch(`${base}/videos/${encodeURIComponent(teamName)}`)
        .then(r => r.json())
        .then(d => setVideos(d.videos ?? []))
        .finally(() => setLoading(p => ({ ...p, videos: false }))),
    ]);
  }, [teamName]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchAll();
  }, [user, fetchAll, router]);

  if (!user) return null;

  // ── No team selected ──────────────────────────────────────────────────────────

  if (!team) {
    return (
      <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[var(--muted)] text-xs tracking-widest uppercase mb-4">No nation selected</p>
          <button onClick={() => setShowPicker(true)}
            className="px-8 py-3 font-display text-2xl uppercase tracking-widest btn-cut-lg"
            style={{ background: primary, color: 'var(--dark)' }}>
            Pick Your Nation
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'news'      as const, label: 'Dispatches', icon: '📡', count: news.length + moreNews.length },
    { id: 'community' as const, label: 'Community',  icon: '🔥', count: reddit.length },
    { id: 'videos'    as const, label: 'Highlights', icon: '🎬', count: videos.length },
  ];

  return (
    <div className="min-h-screen bg-[var(--dark)] text-[var(--text)]">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 12%, var(--dark)) 0%, var(--dark) 60%)` }}>

        {/* Background flag */}
        <div className="absolute inset-0 flex items-center justify-end pr-12 opacity-[0.07] pointer-events-none select-none" aria-hidden>
          <span className="text-[220px] blur-sm">{team.flag}</span>
        </div>

        {/* Grid overlay */}
        <div className="grid-bg opacity-30" />

        <div className="relative max-w-5xl mx-auto px-4 pt-5 pb-8 z-10">

          {/* Nav row */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => router.push('/')}
              className="font-mono text-[11px] tracking-widest uppercase transition-colors theme-transition"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = primary)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              ← Hub
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPicker(true)}
                className="font-mono text-[11px] tracking-widest uppercase px-3 py-1.5 border transition-all theme-transition btn-cut"
                style={{
                  borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
                  color: 'var(--muted)',
                  background: 'var(--dark3)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = primary)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                Switch Nation
              </button>
              <button onClick={fetchAll}
                className="font-mono text-[11px] tracking-widest uppercase px-3 py-1.5 border transition-all theme-transition btn-cut"
                style={{
                  borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
                  color: 'var(--muted)',
                  background: 'var(--dark3)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = primary)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                ↺ Refresh
              </button>
            </div>
          </div>

          {/* Nation identity */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 flex items-center justify-center text-5xl flex-shrink-0 border-2 theme-transition"
              style={{
                background: `color-mix(in srgb, ${primary} 12%, transparent)`,
                borderColor: `color-mix(in srgb, ${primary} 30%, transparent)`,
              }}>
              {team.flag}
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase mb-2 theme-transition"
                style={{
                  background: `color-mix(in srgb, ${primary} 15%, transparent)`,
                  color: primary,
                  border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`,
                }}>
                <span>{team.confederation}</span>
                <span className="opacity-50">·</span>
                <span>WC 2026</span>
              </div>

              <h1 className="font-display text-5xl sm:text-7xl leading-none tracking-widest uppercase theme-transition"
                style={{ color: primary }}>
                {team.name}
              </h1>

              <p className="font-mono text-[11px] uppercase tracking-[4px] mt-2" style={{ color: 'var(--muted)' }}>
                Nation Intel · Live Dossier
              </p>
            </div>
          </div>

          {/* Accent line */}
          <div className="mt-8 h-px theme-transition"
            style={{ background: `linear-gradient(90deg, ${primary}50, transparent)` }} />
        </div>
      </div>

      {/* ── TABS ────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b theme-transition"
        style={{
          background: 'rgba(6,10,6,0.92)',
          backdropFilter: 'blur(24px)',
          borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
        }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-px py-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 font-mono text-[11px] tracking-widest uppercase transition-all theme-transition"
                style={activeTab === tab.id
                  ? { background: primary, color: 'var(--dark)' }
                  : { color: 'var(--muted)' }}
                onMouseEnter={e => {
                  if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text)';
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--muted)';
                }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5"
                    style={{
                      background: activeTab === tab.id ? 'rgba(0,0,0,0.2)' : `color-mix(in srgb, ${primary} 12%, transparent)`,
                      color: activeTab === tab.id ? 'var(--dark)' : primary,
                    }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── NEWS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'news' && (
          <div>
            <SectionHead icon="📡" label="Latest Dispatches" sub="Guardian · Live football intelligence" primary={primary} />
            {loading.news ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border" style={{ borderColor: 'var(--mid)', background: 'var(--dark3)' }}>
                    <Skeleton className="h-36" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">📭</p>
                <p className="font-mono text-xs tracking-widest">No dispatches found for {team.name}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {news.map((a, i) => <NewsCard key={a.id ?? i} article={a} primary={primary} />)}
                </div>

                {moreNews.length > 0 && (
                  <div className="mt-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 theme-transition"
                        style={{ background: `color-mix(in srgb, ${primary} 20%, transparent)` }} />
                      <span className="font-mono text-[10px] uppercase tracking-[4px]" style={{ color: 'var(--muted)' }}>
                        More Sources
                      </span>
                      <div className="h-px flex-1 theme-transition"
                        style={{ background: `color-mix(in srgb, ${primary} 20%, transparent)` }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {moreNews.map((a, i) => <NewsCard key={i} article={a} primary={primary} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── COMMUNITY TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'community' && (
          <div>
            <SectionHead icon="🔥" label="Community Pulse" sub="r/soccer · r/worldcup · trending now" primary={primary} />
            {loading.reddit ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-4 border" style={{ borderColor: 'var(--mid)', background: 'var(--dark3)' }}>
                    <Skeleton className="w-10 h-12 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reddit.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">🔇</p>
                <p className="font-mono text-xs tracking-widest">No trending posts found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {reddit.map(post => <RedditCard key={post.id} post={post} primary={primary} />)}
                <a href={`https://www.reddit.com/r/soccer/search/?q=${encodeURIComponent(teamName)}&sort=hot`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-center py-3 border font-mono text-[11px] tracking-widest uppercase transition-all theme-transition"
                  style={{
                    borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
                    color: 'var(--muted)',
                    background: 'var(--dark3)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = primary; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}>
                  View more on Reddit →
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── VIDEOS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'videos' && (
          <div>
            <SectionHead icon="🎬" label="Highlights & Clips" sub="YouTube · latest footage" primary={primary} />
            {loading.videos ? (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-56 border" style={{ borderColor: 'var(--mid)', background: 'var(--dark3)' }}>
                    <Skeleton className="h-32" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">📹</p>
                <p className="font-mono text-xs tracking-widest">No videos found · Add YouTube API key to enable</p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory custom-scrollbar">
                {videos.map(v => (
                  <div key={v.id} className="snap-start">
                    <VideoCard video={v} primary={primary} />
                  </div>
                ))}
              </div>
            )}

            {reddit.length > 0 && (
              <div className="mt-10">
                <SectionHead icon="💬" label="Fan Reactions" sub="Hottest community posts this week" primary={primary} />
                <div className="flex flex-col gap-2">
                  {reddit.slice(0, 4).map(post => <RedditCard key={post.id} post={post} primary={primary} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
