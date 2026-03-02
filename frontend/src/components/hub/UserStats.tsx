'use client';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

const RANKS = [
  { title: 'Scout',     min: 0,    max: 99   },
  { title: 'Analyst',   min: 100,  max: 299  },
  { title: 'Tactician', min: 300,  max: 599  },
  { title: 'Commander', min: 600,  max: 999  },
  { title: 'Legend',    min: 1000, max: 9999 },
];

const RANK_COLORS: Record<string, string> = {
  Legend:    '#FFD700',
  Commander: '#C084FC',
  Tactician: '#60A5FA',
  Analyst:   '#34D399',
  Scout:     '#9CA3AF',
};

export default function UserStats() {
  const { primary } = useTheme();
  const { user } = useAuth();
  if (!user) return null;

  const pts = user.football_iq_points;
  const currentRank = RANKS.find(r => pts >= r.min && pts <= r.max) ?? RANKS[0];
  const nextRank    = RANKS[RANKS.indexOf(currentRank) + 1];
  const rankColor   = RANK_COLORS[user.rank_title] ?? primary;
  const progress    = nextRank
    ? Math.round(((pts - currentRank.min) / (nextRank.min - currentRank.min)) * 100)
    : 100;

  return (
    <div className="w-full border theme-transition flex flex-col relative overflow-hidden"
      style={{ background: '#0a0a0a', borderColor: 'rgba(255,255,255,0.08)' }}>

      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-px theme-transition"
        style={{ background: `linear-gradient(90deg, ${primary}, transparent)` }} />

      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-mono text-[10px] tracking-[3px] uppercase"
          style={{ color: 'rgba(255,255,255,0.35)' }}>Your Profile</span>
        <span className="font-mono text-[10px] tracking-wider uppercase px-3 py-1 font-bold theme-transition"
          style={{ background: `${rankColor}18`, color: rankColor, border: `1px solid ${rankColor}40` }}>
          {user.rank_title}
        </span>
      </div>

      {/* Main content */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 flex items-center justify-center font-display text-3xl flex-shrink-0 theme-transition"
          style={{ background: `${primary}18`, color: primary, border: `2px solid ${primary}40` }}>
          {user.username[0].toUpperCase()}
        </div>

        {/* Name / country */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-xl leading-tight truncate">{user.username}</p>
          <p className="font-mono text-[11px] tracking-widest uppercase mt-0.5"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            {user.country_allegiance}
          </p>
        </div>

        {/* Points */}
        <div className="text-right flex-shrink-0">
          <p className="font-display leading-none theme-transition"
            style={{ fontSize: '3.5rem', color: primary, textShadow: `0 0 30px ${primary}44` }}>
            {pts.toLocaleString()}
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.35)' }}>IQ Points</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-5">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider mb-2">
          <span className="font-bold" style={{ color: rankColor }}>{currentRank.title}</span>
          {nextRank && (
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>
              {nextRank.min - pts} pts to {nextRank.title}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${rankColor}cc, ${rankColor})` }} />
        </div>
      </div>
    </div>
  );
}
