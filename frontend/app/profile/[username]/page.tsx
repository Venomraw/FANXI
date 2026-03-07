'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import NavBar from '@/src/components/NavBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublicProfile {
  id: number;
  username: string;
  display_name?: string;
  avatar_id?: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
  global_rank: number;
  prediction_count: number;
  favorite_nation?: string;
  favorite_club?: string;
  preferred_formation?: string;
  tactical_style?: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  football_iq_points: number;
  rank_title: string;
}

interface MatchPrediction {
  id: number;
  match_id: number;
  match_result: string | null;
  btts_prediction: boolean | null;
  correct_score: { home: number; away: number } | null;
  over_under: { line: number; pick: string } | null;
  ht_ft: { ht: string; ft: string } | null;
  player_predictions: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

type ProfileTab = 'overview' | 'predictions' | 'badges' | 'dna';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RANK_COLORS: Record<string, string> = {
  Legend:    '#FFD700',
  Commander: '#C084FC',
  Tactician: '#60A5FA',
  Analyst:   '#34D399',
  Scout:     '#9CA3AF',
};

const RANK_THRESHOLDS: [number, string][] = [
  [1000, 'Legend'],
  [600,  'Commander'],
  [300,  'Tactician'],
  [100,  'Analyst'],
  [0,    'Scout'],
];

const COUNTRY_FLAGS: Record<string, string> = {
  Brazil: '🇧🇷', Argentina: '🇦🇷', France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Spain: '🇪🇸', Germany: '🇩🇪', Portugal: '🇵🇹', Netherlands: '🇳🇱',
  Italy: '🇮🇹', USA: '🇺🇸', Mexico: '🇲🇽', Japan: '🇯🇵',
  Morocco: '🇲🇦', Senegal: '🇸🇳', Uruguay: '🇺🇾', Colombia: '🇨🇴',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextRank(pts: number): { name: string; needed: number } | null {
  for (const [threshold, name] of RANK_THRESHOLDS) {
    if (pts < threshold) return { name, needed: threshold - pts };
  }
  return null; // Already Legend
}

function currentTierMin(pts: number): number {
  for (const [threshold] of RANK_THRESHOLDS) {
    if (pts >= threshold) return threshold;
  }
  return 0;
}

function computeAccuracy(history: MatchPrediction[]): number {
  if (history.length === 0) return 0;
  const scored = history.filter(h => h.match_result !== null);
  if (scored.length === 0) return 0;
  // Count predictions that have any outcome filled = proxy for engagement accuracy
  // Real accuracy needs scoring data — use match_result as proxy: how often they picked one
  const withPicks = scored.filter(h => h.match_result || h.btts_prediction !== null || h.correct_score);
  return Math.round((withPicks.length / scored.length) * 100);
}

function computeTacticalDNA(history: MatchPrediction[]) {
  const total = history.length;
  if (total === 0) return { bttsYes: 0, overPicks: 0, correctScoreAttempts: 0 };
  const bttsYes = history.filter(h => h.btts_prediction === true).length;
  const overPicks = history.filter(h => h.over_under?.pick === 'over').length;
  const correctScoreAttempts = history.filter(h => h.correct_score !== null).length;
  return {
    bttsYes: Math.round((bttsYes / total) * 100),
    overPicks: Math.round((overPicks / total) * 100),
    correctScoreAttempts: Math.round((correctScoreAttempts / total) * 100),
  };
}

function styleTags(history: MatchPrediction[]): string[] {
  const tags: string[] = [];
  const total = history.length;
  if (total === 0) return tags;
  const dna = computeTacticalDNA(history);
  if (dna.bttsYes > 60) tags.push('BTTS Believer');
  if (dna.overPicks > 65) tags.push('Goal Hunter');
  if (dna.correctScoreAttempts > 70) tags.push('Score Sniper');
  if (history.filter(h => h.match_result === 'away').length / total > 0.4) tags.push('Upset Hunter');
  if (history.filter(h => h.match_result === 'draw').length / total > 0.35) tags.push('Stalemate Scout');
  if (tags.length === 0) tags.push('Balanced Scout');
  return tags;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const { primary } = useTheme();
  const col = color ?? primary;
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 py-5 px-4 border theme-transition"
      style={{
        background: `color-mix(in srgb, ${col} 6%, var(--dark3))`,
        borderColor: `color-mix(in srgb, ${col} 20%, transparent)`,
      }}
    >
      <span className="font-display leading-none theme-transition" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: col }}>
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  );
}

function TabButton({
  active, icon, label, onClick,
}: {
  active: boolean; icon: string; label: string; onClick: () => void;
}) {
  const { primary } = useTheme();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3.5 font-sans font-semibold text-[14px] border-b-2 transition-all"
      style={{
        borderBottomColor: active ? primary : 'transparent',
        color: active ? 'var(--text)' : 'var(--muted)',
        background: active ? `color-mix(in srgb, ${primary} 5%, transparent)` : 'transparent',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function BadgeCard({
  icon, label, desc, earned,
}: {
  icon: string; label: string; desc: string; earned: boolean;
}) {
  const { primary } = useTheme();
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border theme-transition"
      style={{
        background: earned ? `color-mix(in srgb, ${primary} 6%, var(--dark3))` : 'var(--dark3)',
        borderColor: earned ? `color-mix(in srgb, ${primary} 30%, transparent)` : 'var(--border)',
        opacity: earned ? 1 : 0.45,
        filter: earned ? 'none' : 'grayscale(1)',
      }}
    >
      <span className="text-3xl leading-none flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-sans font-semibold text-[15px]" style={{ color: earned ? 'var(--text)' : 'var(--muted)' }}>
          {label}
        </p>
        <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{desc}</p>
      </div>
      {earned && (
        <span
          className="font-mono text-[10px] uppercase px-2.5 py-1 flex-shrink-0 theme-transition"
          style={{ color: primary, background: `color-mix(in srgb, ${primary} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)` }}
        >
          Earned
        </span>
      )}
    </div>
  );
}

function DNABar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-sans font-semibold text-[13px]" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="font-mono text-[11px]" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { primary } = useTheme();
  const { user: authUser } = useAuth();

  const username = typeof params.username === 'string' ? params.username : '';

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [history, setHistory] = useState<MatchPrediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('overview');

  useEffect(() => {
    if (!username) return;

    setLoading(true);
    setNotFound(false);

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/profile/${encodeURIComponent(username)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data: PublicProfile | null) => {
        if (!data) return;
        setProfile(data);
        // Fetch history + leaderboard in parallel
        return Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/predictions/history/${data.id}`).then(r => r.json()),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/predictions/leaderboard`).then(r => r.json()),
        ]);
      })
      .then(results => {
        if (!results) return;
        const [hist, lb] = results as [MatchPrediction[], LeaderboardEntry[]];
        setHistory(hist ?? []);
        setLeaderboard(lb ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username]);

  const isOwnProfile = authUser?.username === username;

  // ---------- derived stats ----------
  const rankColor = profile ? (RANK_COLORS[profile.rank_title] ?? primary) : primary;
  const percentile = (() => {
    if (!profile || leaderboard.length === 0) return null;
    const idx = leaderboard.findIndex(e => e.username === username);
    if (idx === -1) return null;
    return Math.max(1, Math.round((1 - idx / leaderboard.length) * 100));
  })();

  const next = profile ? nextRank(profile.football_iq_points) : null;
  const tierMin = profile ? currentTierMin(profile.football_iq_points) : 0;
  const tierMax = next ? tierMin + (next.needed + (profile!.football_iq_points - tierMin)) : profile?.football_iq_points ?? 0;
  const progressPct = profile && next
    ? Math.round(((profile.football_iq_points - tierMin) / (tierMax - tierMin)) * 100)
    : 100;

  const dna = computeTacticalDNA(history);
  const tags = styleTags(history);
  const accuracy = computeAccuracy(history);

  const countryFlag = profile
    ? (COUNTRY_FLAGS[profile.country_allegiance] ?? '🌍')
    : '🌍';

  // ---------- badges ----------
  const badges = profile ? [
    { icon: '🔒', label: 'First Lock', desc: 'Lock your first prediction', earned: profile.prediction_count >= 1 },
    { icon: '📊', label: 'Data Scout', desc: 'Make 5 or more predictions', earned: profile.prediction_count >= 5 },
    { icon: '🧠', label: 'Veteran Scout', desc: 'Make 10 or more predictions', earned: profile.prediction_count >= 10 },
    { icon: '⭐', label: 'Elite Tier', desc: 'Reach the top 10%', earned: percentile !== null && percentile >= 90 },
    { icon: '🥇', label: 'Top 100', desc: 'Rank in the global top 100', earned: profile.global_rank <= 100 },
    { icon: '🏆', label: 'Legend Status', desc: 'Achieve 1000+ IQ points', earned: profile.football_iq_points >= 1000 },
  ] : [];

  // ---------- loading / not found ----------
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        <NavBar subtitle="PROFILE" />
        <div className="flex items-center justify-center h-[60vh]">
          <span className="font-mono text-[12px] uppercase tracking-[3px]" style={{ color: 'var(--muted)' }}>
            Loading scout data...
          </span>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        <NavBar subtitle="PROFILE" />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
          <span className="font-display" style={{ fontSize: '80px', lineHeight: 1 }}>404</span>
          <p className="font-sans font-semibold text-[18px]" style={{ color: 'var(--muted)' }}>
            Scout not found
          </p>
          <button
            onClick={() => router.push('/leaderboard')}
            className="font-sans font-semibold text-[13px] px-6 py-3 border transition-all"
            style={{ borderColor: primary, color: primary, background: `color-mix(in srgb, ${primary} 8%, transparent)` }}
          >
            View Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'transparent' }}>
      <NavBar subtitle="PROFILE" />
      <div className="grid-bg opacity-20" />

      {/* ── HERO ──────────────────────────────────────────── */}
      <div
        className="relative py-16 border-b theme-transition"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, ${rankColor} 12%, transparent) 0%, transparent 70%), rgba(0,0,0,0.35)`,
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-7 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">

            {/* Avatar */}
            {(() => {
              const AVATAR_EMOJIS: Record<string, string> = {
                football: '⚽', goalkeeper: '🥅', gloves: '🧤', tactician: '🎯',
                captain: '👑', striker: '⚡', beast: '🦁', fire: '🔥',
                champion: '🏆', star: '🌟', robot: '🤖', diamond: '💎',
              };
              const emoji = profile.avatar_id ? AVATAR_EMOJIS[profile.avatar_id] : null;
              return (
                <div
                  className="w-24 h-24 flex items-center justify-center font-display font-semibold flex-shrink-0 theme-transition"
                  style={{
                    fontSize: emoji ? '48px' : '48px',
                    background: `color-mix(in srgb, ${rankColor} 18%, var(--dark3))`,
                    color: rankColor,
                    border: `2px solid color-mix(in srgb, ${rankColor} 50%, transparent)`,
                    boxShadow: `0 0 32px color-mix(in srgb, ${rankColor} 25%, transparent)`,
                  }}
                >
                  {emoji ?? profile.username[0].toUpperCase()}
                </div>
              );
            })()}

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1
                  className="font-display leading-none"
                  style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: 'var(--text)' }}
                >
                  {profile.display_name || profile.username}
                </h1>
                <span
                  className="font-mono text-[11px] uppercase tracking-[1.5px] px-3 py-1.5 flex-shrink-0 theme-transition"
                  style={{
                    color: rankColor,
                    background: `color-mix(in srgb, ${rankColor} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${rankColor} 35%, transparent)`,
                  }}
                >
                  {profile.rank_title}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-sans text-[15px]" style={{ color: 'var(--muted)' }}>
                  {countryFlag} Scout from {profile.country_allegiance}
                </span>
                {percentile !== null && (
                  <span className="font-mono text-[11px]" style={{ color: primary }}>
                    · Top {100 - percentile + 1}%
                  </span>
                )}
              </div>
            </div>

            {/* CTA button */}
            <div className="flex-shrink-0">
              {isOwnProfile ? (
                <button
                  onClick={() => router.push('/settings')}
                  className="font-sans font-semibold text-[13px] px-6 py-3 border transition-all"
                  style={{ borderColor: primary, color: primary, background: `color-mix(in srgb, ${primary} 8%, transparent)` }}
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  className="font-sans font-semibold text-[13px] px-6 py-3 border transition-all"
                  style={{ borderColor: primary, color: primary, background: `color-mix(in srgb, ${primary} 8%, transparent)` }}
                >
                  Challenge
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-7 py-10 relative z-10">

        {/* ── STATS STRIP ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label="Global Rank" value={`#${profile.global_rank}`} color={rankColor} />
          <StatCard label="IQ Points" value={profile.football_iq_points.toLocaleString()} color={primary} />
          <StatCard label="Predictions" value={profile.prediction_count} />
          <StatCard label="Completion" value={`${accuracy}%`} />
        </div>

        {/* ── RANK PROGRESS BAR ── */}
        {next ? (
          <div
            className="border p-5 mb-8 theme-transition"
            style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[1.5px]" style={{ color: rankColor }}>
                  {profile.rank_title}
                </span>
                <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>→</span>
                <span className="font-mono text-[11px] uppercase tracking-[1.5px]" style={{ color: RANK_COLORS[next.name] ?? 'var(--muted)' }}>
                  {next.name}
                </span>
              </div>
              <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                {next.needed} pts needed
              </span>
            </div>
            <div className="h-2 w-full" style={{ background: 'var(--border)' }}>
              <div
                className="h-full transition-all duration-700 theme-transition"
                style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${rankColor}, ${primary})` }}
              />
            </div>
          </div>
        ) : (
          <div className="border p-5 mb-8 text-center theme-transition"
            style={{ background: `color-mix(in srgb, ${rankColor} 8%, var(--dark3))`, borderColor: `color-mix(in srgb, ${rankColor} 30%, transparent)` }}>
            <span className="font-mono text-[12px] uppercase tracking-[2px]" style={{ color: rankColor }}>
              ★ Legend Status Achieved ★
            </span>
          </div>
        )}

        {/* ── TABS ── */}
        <div className="flex border-b mb-8 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          <TabButton active={tab === 'overview'}    icon="📊" label="Overview"     onClick={() => setTab('overview')} />
          <TabButton active={tab === 'predictions'} icon="🎯" label="Predictions"  onClick={() => setTab('predictions')} />
          <TabButton active={tab === 'badges'}      icon="🏅" label="Badges"       onClick={() => setTab('badges')} />
          <TabButton active={tab === 'dna'}         icon="⚽" label="Tactical DNA" onClick={() => setTab('dna')} />
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-6">

            {/* Big 3 stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total IQ Points', value: profile.football_iq_points.toLocaleString(), color: rankColor },
                { label: 'Matches Predicted', value: profile.prediction_count, color: primary },
                { label: 'Completion Rate', value: `${accuracy}%`, color: '#00D1FF' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="border p-6 text-center theme-transition"
                  style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${color} 25%, transparent)` }}
                >
                  <div className="font-display leading-none mb-2 theme-transition" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', color }}>
                    {value}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Style tags */}
            <div
              className="border p-6 theme-transition"
              style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[1.5px] mb-4" style={{ color: 'var(--muted)' }}>
                Tactical Identity
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="font-sans font-semibold text-[13px] px-4 py-2 border theme-transition"
                    style={{
                      color: primary,
                      background: `color-mix(in srgb, ${primary} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${primary} 30%, transparent)`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="font-mono text-[12px]" style={{ color: 'var(--muted)' }}>
                    Make more predictions to reveal your style
                  </span>
                )}
              </div>
            </div>

            {/* Country + info */}
            <div
              className="border p-6 theme-transition"
              style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[1.5px] mb-4" style={{ color: 'var(--muted)' }}>
                Scout Intel
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1.5px] mb-1" style={{ color: 'var(--muted)' }}>Nation</p>
                  <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--text)' }}>
                    {countryFlag} {profile.favorite_nation || profile.country_allegiance}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1.5px] mb-1" style={{ color: 'var(--muted)' }}>Global Standing</p>
                  <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--text)' }}>
                    #{profile.global_rank} worldwide
                    {percentile !== null && ` · Top ${100 - percentile + 1}%`}
                  </p>
                </div>
                {profile.favorite_club && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px] mb-1" style={{ color: 'var(--muted)' }}>Club</p>
                    <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--text)' }}>
                      {profile.favorite_club}
                    </p>
                  </div>
                )}
                {profile.preferred_formation && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px] mb-1" style={{ color: 'var(--muted)' }}>Formation</p>
                    <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--text)' }}>
                      {profile.preferred_formation}
                    </p>
                  </div>
                )}
                {profile.tactical_style && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px] mb-1" style={{ color: 'var(--muted)' }}>Tactical Style</p>
                    <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--text)' }}>
                      {profile.tactical_style.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PREDICTIONS TAB ── */}
        {tab === 'predictions' && (
          <div className="flex flex-col gap-3">
            {history.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-display text-[48px] leading-none mb-4" style={{ color: 'var(--border)' }}>📭</p>
                <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--muted)' }}>
                  No predictions locked yet
                </p>
              </div>
            ) : (
              history.map(pred => (
                <div
                  key={pred.id}
                  className="border p-4 flex flex-col sm:flex-row sm:items-center gap-3 theme-transition"
                  style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 flex items-center justify-center font-mono text-[12px] font-bold flex-shrink-0 theme-transition"
                      style={{
                        background: `color-mix(in srgb, ${primary} 12%, transparent)`,
                        color: primary,
                        border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`,
                      }}
                    >
                      M{pred.match_id}
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans font-semibold text-[14px]" style={{ color: 'var(--text)' }}>
                        Match #{pred.match_id}
                      </p>
                      <p className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                        {new Date(pred.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Prediction summary chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {pred.match_result && (
                      <span className="font-mono text-[10px] uppercase px-2 py-1 border theme-transition"
                        style={{ color: primary, borderColor: `color-mix(in srgb, ${primary} 25%, transparent)`, background: `color-mix(in srgb, ${primary} 8%, transparent)` }}>
                        {pred.match_result}
                      </span>
                    )}
                    {pred.correct_score && (
                      <span className="font-mono text-[10px] uppercase px-2 py-1 border theme-transition"
                        style={{ color: '#00D1FF', borderColor: 'rgba(0,209,255,0.25)', background: 'rgba(0,209,255,0.08)' }}>
                        {pred.correct_score.home}–{pred.correct_score.away}
                      </span>
                    )}
                    {pred.btts_prediction !== null && (
                      <span className="font-mono text-[10px] uppercase px-2 py-1 border"
                        style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'transparent' }}>
                        BTTS {pred.btts_prediction ? 'Yes' : 'No'}
                      </span>
                    )}
                    {pred.over_under && (
                      <span className="font-mono text-[10px] uppercase px-2 py-1 border"
                        style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'transparent' }}>
                        {pred.over_under.pick} {pred.over_under.line}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <span
                    className="font-mono text-[10px] uppercase px-3 py-1.5 flex-shrink-0"
                    style={{
                      color: pred.status === 'SCORED' ? '#00FF85' : 'var(--muted)',
                      background: pred.status === 'SCORED' ? 'rgba(0,255,133,0.1)' : 'var(--border)',
                    }}
                  >
                    {pred.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── BADGES TAB ── */}
        {tab === 'badges' && (
          <div className="flex flex-col gap-3">
            {badges.map(b => (
              <BadgeCard key={b.label} {...b} />
            ))}
            <div
              className="border p-5 text-center mt-2 theme-transition"
              style={{ borderColor: 'var(--border)', background: 'var(--dark3)' }}
            >
              <span className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                More badges coming soon
              </span>
            </div>
          </div>
        )}

        {/* ── TACTICAL DNA TAB ── */}
        {tab === 'dna' && (
          <div className="flex flex-col gap-6">
            {history.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--muted)' }}>
                  No tactical data yet — lock some predictions first
                </p>
              </div>
            ) : (
              <>
                {/* DNA bars */}
                <div
                  className="border p-6 flex flex-col gap-5 theme-transition"
                  style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
                    Prediction Tendencies
                  </p>
                  <DNABar label="BTTS Optimism" pct={dna.bttsYes} color="#00FF85" />
                  <DNABar label="Goal Hunger (Over bias)" pct={dna.overPicks} color="#00D1FF" />
                  <DNABar label="Score Sniper (Exact score attempts)" pct={dna.correctScoreAttempts} color={primary} />
                </div>

                {/* Style tags */}
                <div
                  className="border p-6 theme-transition"
                  style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[1.5px] mb-4" style={{ color: 'var(--muted)' }}>
                    Scout Archetype
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="font-sans font-semibold text-[14px] px-5 py-2.5 border theme-transition"
                        style={{
                          color: primary,
                          background: `color-mix(in srgb, ${primary} 10%, transparent)`,
                          borderColor: `color-mix(in srgb, ${primary} 30%, transparent)`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Formation heatmap placeholder */}
                <div
                  className="border p-6 theme-transition"
                  style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[1.5px] mb-2" style={{ color: 'var(--muted)' }}>
                    Formation Heatmap
                  </p>
                  <p className="font-sans text-[14px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Formation preference tracking coming in the next update
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  );
}
