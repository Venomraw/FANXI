'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | number): string {
  const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatScore(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-xl ${className}`} />;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHead({ icon, label, sub, primary }: { icon: string; label: string; sub?: string; primary: string }) {
  return (
    <div className="flex items-end gap-3 mb-5">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-lg font-black uppercase tracking-tighter" style={{ color: primary }}>{label}</h2>
        {sub && <p className="text-zinc-600 text-[10px] uppercase tracking-widest">{sub}</p>}
      </div>
    </div>
  );
}

// ── News Card ─────────────────────────────────────────────────────────────────

function NewsCard({ article, primary }: { article: Article; primary: string }) {
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all hover:-translate-y-0.5 duration-200">
      {article.thumbnail ? (
        <div className="h-36 overflow-hidden">
          <img src={article.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center text-3xl"
          style={{ background: `linear-gradient(135deg, ${primary}20, transparent)` }}>
          📰
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="text-white text-sm font-bold leading-snug line-clamp-2 group-hover:text-zinc-200 transition-colors">
          {article.title}
        </p>
        {article.trail && (
          <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-2"
            dangerouslySetInnerHTML={{ __html: article.trail }} />
        )}
        <div className="mt-auto flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-[10px] text-zinc-600 uppercase">
            {article.byline || article.source || 'The Guardian'}
          </span>
          <span className="text-[10px] text-zinc-700">{timeAgo(article.published)}</span>
        </div>
      </div>
    </a>
  );
}

// ── Reddit Card ───────────────────────────────────────────────────────────────

function RedditCard({ post, primary }: { post: RedditPost; primary: string }) {
  return (
    <a href={post.url} target="_blank" rel="noopener noreferrer"
      className="group flex gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-600 transition-all hover:-translate-y-0.5 duration-200">
      {/* Score */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-10">
        <span className="text-xs font-black" style={{ color: primary }}>▲</span>
        <span className="text-white text-xs font-black">{formatScore(post.score)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-snug line-clamp-2 group-hover:text-zinc-200">
          {post.title}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${primary}20`, color: primary }}>
            {post.subreddit}
          </span>
          {post.flair && (
            <span className="text-[10px] text-zinc-600 border border-zinc-800 rounded-full px-2 py-0.5">
              {post.flair}
            </span>
          )}
          <span className="text-[10px] text-zinc-600 ml-auto">💬 {formatScore(post.comments)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px] text-zinc-700">u/{post.author}</span>
          <span className="text-[9px] text-zinc-700">·</span>
          <span className="text-[9px] text-zinc-700">{timeAgo(post.created)}</span>
        </div>
      </div>
    </a>
  );
}

// ── Video Card ────────────────────────────────────────────────────────────────

function VideoCard({ video, primary }: { video: Video; primary: string }) {
  const ytUrl = `https://www.youtube.com/watch?v=${video.id}`;
  return (
    <a href={ytUrl} target="_blank" rel="noopener noreferrer"
      className="group flex-shrink-0 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all hover:-translate-y-0.5 duration-200">
      <div className="relative h-32 overflow-hidden bg-zinc-800">
        {video.thumbnail && (
          <img src={video.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform">
            <span className="text-white text-sm ml-0.5">▶</span>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{video.title}</p>
        <p className="text-zinc-600 text-[10px] mt-1 truncate">{video.channel}</p>
        <p className="text-zinc-700 text-[9px] mt-0.5">{timeAgo(video.published)}</p>
      </div>
    </a>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NationPage() {
  const { team, primary, accent, setShowPicker } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [news, setNews] = useState<Article[]>([]);
  const [moreNews, setMoreNews] = useState<Article[]>([]);
  const [reddit, setReddit] = useState<RedditPost[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState({ news: true, reddit: true, videos: true });
  const [activeTab, setActiveTab] = useState<'news' | 'community' | 'videos'>('news');

  const teamName = team?.name ?? '';

  const fetchAll = useCallback(async () => {
    if (!teamName) return;
    const base = 'http://localhost:8000/intel';

    setLoading({ news: true, reddit: true, videos: true });

    // Parallel fetch all sources
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

  // ── No team selected ───────────────────────────────────────────────────────

  if (!team) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-sm mb-4">No nation selected</p>
          <button onClick={() => setShowPicker(true)}
            className="px-6 py-3 rounded-xl font-black uppercase text-sm text-black"
            style={{ backgroundColor: '#22c55e' }}>
            Pick Your Nation
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'news' as const,      label: 'Dispatches',   icon: '📡', count: news.length + moreNews.length },
    { id: 'community' as const, label: 'Community',    icon: '🔥', count: reddit.length },
    { id: 'videos' as const,    label: 'Highlights',   icon: '🎬', count: videos.length },
  ];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary}18 0%, #000 60%)` }}>

        {/* Background flag emoji blurred */}
        <div className="absolute inset-0 flex items-center justify-end pr-8 opacity-10 pointer-events-none select-none"
          aria-hidden>
          <span className="text-[200px] blur-sm">{team.flag}</span>
        </div>

        {/* Animated grid overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${primary} 1px, transparent 1px), linear-gradient(90deg, ${primary} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />

        <div className="relative max-w-5xl mx-auto px-4 pt-6 pb-8">
          {/* Nav row */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => router.push('/')}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
              ← Hub
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPicker(true)}
                className="text-[10px] font-bold uppercase text-zinc-600 hover:text-white transition-colors border border-zinc-800 px-3 py-1.5 rounded-lg">
                Switch Nation
              </button>
              <button onClick={fetchAll}
                className="text-[10px] font-bold uppercase text-zinc-600 hover:text-white transition-colors border border-zinc-800 px-3 py-1.5 rounded-lg">
                ↺ Refresh
              </button>
            </div>
          </div>

          {/* Nation identity */}
          <div className="flex items-center gap-6">
            {/* Flag block */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0 border-2"
              style={{ backgroundColor: `${primary}20`, borderColor: `${primary}40` }}>
              {team.flag}
            </div>

            <div>
              {/* Confederation badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-2"
                style={{ backgroundColor: `${primary}20`, color: primary, border: `1px solid ${primary}30` }}>
                <span>{team.confederation}</span>
                <span className="opacity-50">·</span>
                <span>WC 2026</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-none"
                style={{ color: primary }}>
                {team.name}
              </h1>

              <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1.5">
                Nation Intel · Live Dossier
              </p>
            </div>
          </div>

          {/* Divider with accent */}
          <div className="mt-8 h-px" style={{ background: `linear-gradient(90deg, ${primary}60, transparent)` }} />
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  activeTab === tab.id ? 'text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={activeTab === tab.id ? { backgroundColor: primary } : {}}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                    activeTab === tab.id ? 'bg-black/20' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── NEWS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'news' && (
          <div>
            <SectionHead icon="📡" label="Latest Dispatches" sub="Guardian · Live football intelligence" primary={primary} />
            {loading.news ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden">
                    <Skeleton className="h-36 rounded-none rounded-t-2xl" />
                    <div className="p-4 space-y-2 bg-zinc-900 border border-zinc-800 border-t-0 rounded-b-2xl">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm">No dispatches found for {team.name}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {news.map((a, i) => <NewsCard key={a.id ?? i} article={a} primary={primary} />)}
                </div>

                {/* More news from NewsData */}
                {moreNews.length > 0 && (
                  <div className="mt-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1" style={{ background: `${primary}30` }} />
                      <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">More Sources</span>
                      <div className="h-px flex-1" style={{ background: `${primary}30` }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {moreNews.map((a, i) => <NewsCard key={i} article={a} primary={primary} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── COMMUNITY TAB ───────────────────────────────────────────────── */}
        {activeTab === 'community' && (
          <div>
            <SectionHead icon="🔥" label="Community Pulse" sub="r/soccer · r/worldcup · trending now" primary={primary} />
            {loading.reddit ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <Skeleton className="w-10 h-12 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reddit.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <p className="text-4xl mb-3">🔇</p>
                <p className="text-sm">No trending posts found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reddit.map(post => <RedditCard key={post.id} post={post} primary={primary} />)}

                <a href={`https://www.reddit.com/r/soccer/search/?q=${encodeURIComponent(teamName)}&sort=hot`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-center py-3 rounded-xl border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-600 text-xs font-bold uppercase transition-all">
                  View more on Reddit →
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── VIDEOS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'videos' && (
          <div>
            <SectionHead icon="🎬" label="Highlights & Clips" sub="YouTube · latest footage" primary={primary} />
            {loading.videos ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <Skeleton className="h-32 rounded-none" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <p className="text-4xl mb-3">📹</p>
                <p className="text-sm">No videos found · Add YouTube API key to enable</p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
                {videos.map(v => (
                  <div key={v.id} className="snap-start">
                    <VideoCard video={v} primary={primary} />
                  </div>
                ))}
              </div>
            )}

            {/* Reddit complement under videos */}
            {reddit.length > 0 && (
              <div className="mt-10">
                <SectionHead icon="💬" label="Fan Reactions" sub="Hottest community posts this week" primary={primary} />
                <div className="flex flex-col gap-3">
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
