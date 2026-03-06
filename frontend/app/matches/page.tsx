'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import NavBar from '@/src/components/NavBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Match {
  id: number;
  home_team: string;
  home_flag: string;
  away_team: string;
  away_flag: string;
  kickoff: string;
  venue: string;
  round: string;
  group: string;
  matchday: number;
}

type View = 'upcoming' | 'groups';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeading(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function groupByDateHeading(matches: Match[]): [string, Match[]][] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = formatDateHeading(m.kickoff);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries());
}

// ---------------------------------------------------------------------------
// Match Card
// ---------------------------------------------------------------------------

function MatchCard({
  match, isPredicted, onPredict, primary,
}: {
  match: Match;
  isPredicted: boolean;
  onPredict: (id: number) => void;
  primary: string;
}) {
  const hours = hoursUntil(match.kickoff);
  const isSoon = hours > 0 && hours < 48;
  const isPast = hours <= 0;
  const isFinalDay = match.matchday === 3;

  return (
    <div
      className="border theme-transition group/card transition-all duration-200"
      style={{
        background: 'var(--dark3)',
        borderColor: 'var(--border)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 40%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div className="p-5">
        {/* Badge row */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="font-mono text-[10px] uppercase tracking-[1.5px] px-2 py-0.5 theme-transition"
            style={{
              color: primary,
              background: `color-mix(in srgb, ${primary} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`,
            }}
          >
            {match.round}
          </span>
          {isFinalDay && (
            <span
              className="font-mono text-[10px] uppercase tracking-[1.5px] px-2 py-0.5"
              style={{ color: '#FFD23F', background: 'rgba(255,210,63,0.1)', border: '1px solid rgba(255,210,63,0.25)' }}
            >
              Final Group Day
            </span>
          )}
          {isSoon && (
            <span
              className="font-mono text-[10px] uppercase tracking-[1.5px] px-2 py-0.5 animate-pulse"
              style={{ color: '#00FF85', background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.3)' }}
            >
              Soon · {Math.floor(hours)}h
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center gap-4 mb-4">
          {/* Home */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-3xl leading-none flex-shrink-0">{match.home_flag}</span>
            <span
              className="font-display leading-none theme-transition"
              style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', color: 'var(--text)' }}
            >
              {match.home_team}
            </span>
          </div>

          {/* VS divider */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <span
              className="font-mono text-[11px] uppercase tracking-[2px]"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              vs
            </span>
          </div>

          {/* Away */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <span
              className="font-display leading-none text-right theme-transition"
              style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', color: 'var(--text)' }}
            >
              {match.away_team}
            </span>
            <span className="text-3xl leading-none flex-shrink-0">{match.away_flag}</span>
          </div>
        </div>

        {/* Meta + CTA */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-[13px]" style={{ color: 'var(--muted)' }}>
              {formatDate(match.kickoff)} · {formatTime(match.kickoff)} local
            </span>
            <span className="font-mono text-[11px] tracking-[0.5px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {match.venue}
            </span>
          </div>

          {isPast ? (
            <span className="font-mono text-[11px] uppercase px-4 py-2" style={{ color: 'rgba(255,255,255,0.2)', border: '1px solid var(--border)' }}>
              Finished
            </span>
          ) : isPredicted ? (
            <span
              className="font-mono text-[11px] uppercase px-4 py-2 flex items-center gap-2 theme-transition"
              style={{ color: '#00FF85', background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.25)' }}
            >
              <span>✓</span> Predicted
            </span>
          ) : (
            <button
              onClick={() => onPredict(match.id)}
              className="font-sans font-semibold text-[13px] px-5 py-2.5 border transition-all theme-transition flex items-center gap-2"
              style={{ color: primary, borderColor: `color-mix(in srgb, ${primary} 40%, transparent)`, background: `color-mix(in srgb, ${primary} 8%, transparent)` }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${primary} 18%, transparent)`;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 16px color-mix(in srgb, ${primary} 30%, transparent)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${primary} 8%, transparent)`;
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              Predict <span style={{ opacity: 0.7 }}>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MatchesPage() {
  const { primary } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<View>('upcoming');
  const [activeGroup, setActiveGroup] = useState('A');
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictedIds, setPredictedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/matches/all`)
      .then(r => r.json())
      .then((data: Match[]) => { setMatches(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/predictions/history/${user.id}`)
      .then(r => r.json())
      .then((hist: { match_id: number }[]) => {
        setPredictedIds(new Set(hist.map(h => h.match_id)));
      })
      .catch(() => {});
  }, [user]);

  const handlePredict = (matchId: number) => {
    router.push(`/?match=${matchId}`);
  };

  // ── Derived lists ──────────────────────────────────────────────────────────

  const upcomingMatches = useMemo(
    () => matches.filter(m => hoursUntil(m.kickoff) > 0),
    [matches],
  );

  const groupMatches = useMemo(
    () => matches.filter(m => m.group === activeGroup),
    [matches, activeGroup],
  );

  const upcomingByDate = useMemo(() => groupByDateHeading(upcomingMatches), [upcomingMatches]);

  const groupByMatchday = useMemo(() => {
    const map: Record<number, Match[]> = {};
    for (const m of groupMatches) {
      if (!map[m.matchday]) map[m.matchday] = [];
      map[m.matchday].push(m);
    }
    return map;
  }, [groupMatches]);

  const matchdayLabels: Record<number, string> = {
    1: 'Matchday 1',
    2: 'Matchday 2',
    3: 'Matchday 3 · Final Group Day',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--dark)' }}>
      <NavBar subtitle="FIXTURES" />
      <div className="grid-bg opacity-20" />

      <div className="max-w-[1400px] mx-auto px-7 py-12 relative z-10">

        {/* ── HEADER ── */}
        <div className="mb-10">
          <p
            className="font-mono text-[11px] uppercase tracking-[1.5px] mb-3 theme-transition"
            style={{ color: primary }}
          >
            World Cup 2026 · Group Stage
          </p>
          <h1
            className="font-display leading-none mb-3"
            style={{ fontSize: 'clamp(4rem, 10vw, 7rem)', color: 'var(--text)' }}
          >
            Fix<span className="theme-transition" style={{ color: primary }}>tures</span>
          </h1>
          <p className="font-sans text-[15px]" style={{ color: 'var(--muted)' }}>
            72 group stage matches · 12 groups · June 11 – 27, 2026
          </p>
        </div>

        {/* ── VIEW TOGGLE ── */}
        <div className="flex gap-2 mb-8">
          {(['upcoming', 'groups'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="font-sans font-semibold text-[13px] px-6 py-3 border transition-all theme-transition"
              style={view === v
                ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                : { background: 'var(--dark3)', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              {v === 'upcoming' ? '🗓 Upcoming' : '🌍 By Group'}
            </button>
          ))}
          <div className="ml-auto flex items-center">
            <span className="font-mono text-[11px] uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {upcomingMatches.length} matches remaining
            </span>
          </div>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div className="py-20 text-center">
            <span className="font-mono text-[12px] uppercase tracking-[3px]" style={{ color: 'var(--muted)' }}>
              Loading fixtures...
            </span>
          </div>
        )}

        {/* ── UPCOMING VIEW ── */}
        {!loading && view === 'upcoming' && (
          <div className="flex flex-col gap-10">
            {upcomingByDate.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-display text-[64px] leading-none mb-4" style={{ color: 'var(--border)' }}>🏁</p>
                <p className="font-sans font-semibold text-[16px]" style={{ color: 'var(--muted)' }}>
                  All group stage matches have been played
                </p>
              </div>
            ) : (
              upcomingByDate.map(([dateLabel, dayMatches]) => (
                <div key={dateLabel}>
                  {/* Date heading */}
                  <div className="flex items-center gap-4 mb-4">
                    <span
                      className="font-display text-[22px] leading-none theme-transition"
                      style={{ color: primary }}
                    >
                      {dateLabel}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {dayMatches.length} {dayMatches.length === 1 ? 'match' : 'matches'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {dayMatches.map(m => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        isPredicted={predictedIds.has(m.id)}
                        onPredict={handlePredict}
                        primary={primary}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── GROUPS VIEW ── */}
        {!loading && view === 'groups' && (
          <div>
            {/* Group tab strip */}
            <div
              className="flex gap-1 mb-8 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none' }}
            >
              {GROUPS.map(g => {
                const gMatches = matches.filter(m => m.group === g);
                const gPredicted = gMatches.filter(m => predictedIds.has(m.id)).length;
                return (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 px-5 py-3 border transition-all theme-transition"
                    style={activeGroup === g
                      ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                      : { background: 'var(--dark3)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                  >
                    <span className="font-display text-[20px] leading-none font-semibold">{g}</span>
                    {gPredicted > 0 && activeGroup !== g && (
                      <span className="font-mono text-[9px]" style={{ opacity: 0.6 }}>{gPredicted}/6 ✓</span>
                    )}
                    {activeGroup === g && (
                      <span className="font-mono text-[9px]" style={{ opacity: 0.7 }}>6 matches</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Group header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <h2
                  className="font-display leading-none theme-transition"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: primary }}
                >
                  Group {activeGroup}
                </h2>
              </div>
              {/* Teams in this group */}
              <div className="flex flex-wrap gap-2 mt-3">
                {matches
                  .filter(m => m.group === activeGroup && m.matchday === 1)
                  .flatMap(m => [
                    { name: m.home_team, flag: m.home_flag },
                    { name: m.away_team, flag: m.away_flag },
                  ])
                  .filter((t, i, arr) => arr.findIndex(x => x.name === t.name) === i)
                  .map(t => (
                    <span
                      key={t.name}
                      className="font-sans font-semibold text-[13px] px-3 py-1.5 border theme-transition"
                      style={{
                        color: 'var(--text)',
                        borderColor: 'var(--border)',
                        background: 'var(--dark3)',
                      }}
                    >
                      {t.flag} {t.name}
                    </span>
                  ))}
              </div>
            </div>

            {/* Matches by matchday */}
            <div className="flex flex-col gap-8">
              {[1, 2, 3].map(md => {
                const mdMatches = groupByMatchday[md] ?? [];
                return (
                  <div key={md}>
                    {/* Matchday divider */}
                    <div className="flex items-center gap-4 mb-4">
                      <span
                        className="font-mono text-[11px] uppercase tracking-[1.5px]"
                        style={{ color: md === 3 ? '#FFD23F' : 'var(--muted)' }}
                      >
                        {matchdayLabels[md]}
                      </span>
                      <div className="flex-1 h-px" style={{ background: md === 3 ? 'rgba(255,210,63,0.2)' : 'var(--border)' }} />
                      {md === 3 && (
                        <span className="font-mono text-[10px]" style={{ color: '#FFD23F', opacity: 0.7 }}>
                          Simultaneous kick-offs
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {mdMatches.map(m => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          isPredicted={predictedIds.has(m.id)}
                          onPredict={handlePredict}
                          primary={primary}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-16" />
      </div>
    </div>
  );
}
