'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import NavBar from '@/src/components/NavBar';

interface LeaderboardEntry {
  rank: number;
  username: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
}

const RANK_COLORS: Record<string, string> = {
  Legend:    '#FFD700',
  Commander: '#C084FC',
  Tactician: '#60A5FA',
  Analyst:   '#34D399',
  Scout:     '#9CA3AF',
};

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
  const { primary } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/predictions/leaderboard')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: 'var(--dark)' }}>
      <NavBar subtitle="RANKINGS" />
      <div className="grid-bg opacity-30" />

      <div className="max-w-[900px] mx-auto px-7 py-8 relative z-10">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-mono text-[11px] tracking-[1.5px] uppercase mb-3 theme-transition"
              style={{ color: primary }}>
              World Cup 2026 · Global Rankings
            </p>
            <h1 className="font-display leading-none"
              style={{ fontSize: 'clamp(3.5rem, 10vw, 6rem)' }}>
              Leader<span className="theme-transition" style={{ color: primary }}>board</span>
            </h1>
          </div>
          <button onClick={() => router.push('/')}
            className="font-sans font-semibold text-[13px] px-5 py-3 border transition-all hover:border-white/30 hover:text-white btn-cut"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', background: '#111' }}>
            ← Hub
          </button>
        </div>

        {/* Rank legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(RANK_COLORS).map(([title, color]) => (
            <div key={title} className="flex items-center gap-2 px-3 py-1.5 border"
              style={{ background: `${color}0d`, borderColor: `${color}30` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-mono text-[10px] tracking-widest uppercase font-bold" style={{ color }}>
                {title}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#0a0a0a' }}>

          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-3 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="w-8 font-mono text-[10px] tracking-widest uppercase theme-transition" style={{ color: primary }}>#</div>
            <div className="w-9" />
            <div className="flex-1 font-mono text-[10px] tracking-widest uppercase theme-transition" style={{ color: primary }}>Scout</div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-right theme-transition" style={{ color: primary }}>IQ Pts</div>
          </div>

          {loading ? (
            <div className="py-16 text-center font-mono text-sm tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              Loading scouts...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No scouts on the board yet.
              </p>
            </div>
          ) : (
            <div>
              {entries.map(entry => {
                const isMe = user?.username === entry.username;
                const rankColor = RANK_COLORS[entry.rank_title] ?? '#9CA3AF';
                return (
                  <div key={entry.rank}
                    className="flex items-center gap-4 px-5 py-4 border-b transition-all theme-transition"
                    style={{
                      borderColor: 'rgba(255,255,255,0.05)',
                      background: isMe ? `${primary}0c` : 'transparent',
                      borderLeft: isMe ? `3px solid ${primary}` : '3px solid transparent',
                    }}>

                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {RANK_MEDALS[entry.rank]
                        ? <span className="text-xl">{RANK_MEDALS[entry.rank]}</span>
                        : <span className="font-display text-3xl leading-none"
                            style={{ color: 'rgba(255,255,255,0.2)' }}>{entry.rank}</span>
                      }
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 flex items-center justify-center font-display text-2xl flex-shrink-0 theme-transition"
                      style={{ background: `${primary}20`, color: primary, border: `1px solid ${primary}35` }}>
                      {entry.username[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/profile/${encodeURIComponent(entry.username)}`}
                          className="font-bold text-base text-white transition-colors"
                          style={{ textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.color = primary)}
                          onMouseLeave={e => (e.currentTarget.style.color = 'white')}
                        >
                          {entry.username}
                        </Link>
                        {isMe && (
                          <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 font-bold theme-transition"
                            style={{ background: `${primary}25`, color: primary }}>
                            You
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] uppercase tracking-widest mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {entry.country_allegiance}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-display text-3xl leading-none" style={{ color: rankColor }}>
                        {entry.football_iq_points.toLocaleString()}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: rankColor }}>
                        {entry.rank_title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center font-mono text-[11px] uppercase tracking-[3px] mt-8 pb-6"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          Points awarded after each match result is confirmed
        </p>
      </div>
    </div>
  );
}
