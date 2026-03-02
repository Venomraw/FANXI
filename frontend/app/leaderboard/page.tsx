'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

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
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between py-6 mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ color: primary }}>
              Leaderboard
            </h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">
              World Cup 2026 · Global Rankings
            </p>
          </div>
          <button onClick={() => router.push('/')}
            className="px-4 py-2 text-[10px] font-black uppercase rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white">
            ← Hub
          </button>
        </div>

        {/* Rank legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(RANK_COLORS).map(([title, color]) => (
            <div key={title} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] font-bold uppercase text-zinc-400">{title}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-zinc-600 text-sm">Loading scouts...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-500 text-sm">No scouts on the board yet.</p>
              <p className="text-zinc-700 text-xs mt-1">Lock a prediction to appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {entries.map((entry) => {
                const isMe = user?.username === entry.username;
                const rankColor = RANK_COLORS[entry.rank_title] ?? '#9CA3AF';
                return (
                  <div key={entry.rank}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                      isMe ? 'bg-white/5' : 'hover:bg-zinc-900/60'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {RANK_MEDALS[entry.rank] ? (
                        <span className="text-xl">{RANK_MEDALS[entry.rank]}</span>
                      ) : (
                        <span className="text-zinc-600 font-black text-sm">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Avatar placeholder */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                      style={{ backgroundColor: `${primary}25`, color: primary, border: `1.5px solid ${primary}40` }}>
                      {entry.username[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isMe ? 'text-white' : 'text-zinc-200'}`}>
                          {entry.username}
                        </span>
                        {isMe && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${primary}30`, color: primary }}>
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-600 text-[10px] uppercase">{entry.country_allegiance}</div>
                    </div>

                    {/* Rank title */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] font-black uppercase" style={{ color: rankColor }}>
                        {entry.rank_title}
                      </div>
                      <div className="text-white font-black text-sm">
                        {entry.football_iq_points.toLocaleString()}
                        <span className="text-zinc-600 font-normal text-[10px] ml-1">pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-zinc-700 text-[10px] uppercase tracking-widest mt-8">
          Points awarded after each match result is confirmed
        </p>
      </div>
    </div>
  );
}
