'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

interface Entry {
  rank: number;
  username: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const RANK_COLORS: Record<string, string> = {
  Legend:    '#FFD700',
  Commander: '#C084FC',
  Tactician: '#60A5FA',
  Analyst:   '#34D399',
  Scout:     '#9CA3AF',
};

export default function MiniLeaderboard() {
  const { primary } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/predictions/leaderboard')
      .then(r => r.json())
      .then(d => setEntries(Array.isArray(d) ? d.slice(0, 5) : []))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full border theme-transition flex flex-col relative overflow-hidden"
      style={{ background: '#0a0a0a', borderColor: 'rgba(255,255,255,0.08)' }}>

      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px theme-transition"
        style={{ background: `linear-gradient(90deg, transparent, ${primary})` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-mono text-[10px] tracking-[3px] uppercase"
          style={{ color: 'rgba(255,255,255,0.35)' }}>Top Scouts</span>
        <button onClick={() => router.push('/leaderboard')}
          className="font-mono text-[11px] tracking-wider uppercase font-bold transition-colors theme-transition"
          style={{ color: primary }}>
          Full Board →
        </button>
      </div>

      {/* Entries */}
      <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {entries.length === 0 ? (
          <p className="px-5 py-6 font-mono text-sm text-center italic"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            No scouts ranked yet — lock a prediction!
          </p>
        ) : entries.map(e => {
          const isMe = user?.username === e.username;
          const rankColor = RANK_COLORS[e.rank_title] ?? '#9CA3AF';
          return (
            <div key={e.rank}
              className="flex items-center gap-4 px-5 py-3 transition-colors theme-transition"
              style={{
                background: isMe ? `${primary}0d` : 'transparent',
                borderLeft: isMe ? `2px solid ${primary}` : '2px solid transparent',
              }}>

              {/* Rank */}
              <div className="w-7 text-center flex-shrink-0">
                {MEDALS[e.rank]
                  ? <span className="text-lg">{MEDALS[e.rank]}</span>
                  : <span className="font-display text-2xl leading-none"
                      style={{ color: 'rgba(255,255,255,0.25)' }}>#{e.rank}</span>
                }
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 flex items-center justify-center font-display text-xl flex-shrink-0 theme-transition"
                style={{ background: `${primary}20`, color: primary, border: `1px solid ${primary}35` }}>
                {e.username[0].toUpperCase()}
              </div>

              {/* Name + country */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-white">
                  {e.username}
                  {isMe && (
                    <span className="font-mono text-[9px] ml-2 tracking-wider theme-transition"
                      style={{ color: primary }}>YOU</span>
                  )}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider truncate"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {e.country_allegiance}
                </p>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <p className="font-display text-2xl leading-none" style={{ color: rankColor }}>
                  {e.football_iq_points.toLocaleString()}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-wider" style={{ color: rankColor }}>
                  {e.rank_title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
