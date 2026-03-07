'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import NavBar from '@/src/components/NavBar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchState {
  match_id?: number;
  status: string;
  minute?: number;
  home_team?: string;
  away_team?: string;
  home_flag?: string;
  away_flag?: string;
  home_goals?: number;
  away_goals?: number;
  ht_home?: number;
  ht_away?: number;
  venue?: string;
  momentum?: { home_pct: number; away_pct: number };
}

interface MatchEvent {
  type: 'goal' | 'card' | 'sub';
  minute?: number;
  team?: string;
  scorer?: string;
  assist?: string;
  player?: string;
  player_out?: string;
  player_in?: string;
  card_type?: string;
}

interface Lineup {
  formation?: string;
  team?: string;
  startXI?: { name: string; number?: number; position?: string }[];
  substitutes?: { name: string; number?: number; position?: string }[];
}

interface Lineups {
  home?: Lineup | null;
  away?: Lineup | null;
}

interface Pulse {
  total_scouts: number;
  result_split: { home: number; draw: number; away: number };
  top_formation?: string;
  top_captain?: string;
  top_captain_pct?: number;
}

interface MyScore {
  formation_correct?: boolean | null;
  formation_pts: number;
  captain_correct?: boolean | null;
  captain_pts: number;
  first_scorer_pts: number;
  result_correct?: boolean | null;
  result_pts: number;
  clean_sheet_pts: number;
  total_pts: number;
  current_rank?: number;
  rank_change?: number;
  total_scouts: number;
  match_status?: string;
}

interface Commentary {
  id?: number;
  minute?: number;
  content: string;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function eventIcon(evt: MatchEvent): string {
  if (evt.type === 'goal') return '⚽';
  if (evt.type === 'card') {
    return evt.card_type?.includes('RED') ? '🟥' : '🟨';
  }
  if (evt.type === 'sub') return '🔄';
  return '•';
}

function eventLabel(evt: MatchEvent): string {
  if (evt.type === 'goal') {
    let s = evt.scorer || 'Unknown';
    if (evt.assist) s += ` (ast. ${evt.assist})`;
    return s;
  }
  if (evt.type === 'card') return evt.player || 'Unknown';
  if (evt.type === 'sub') return `${evt.player_out} → ${evt.player_in}`;
  return '';
}

function statusLabel(status: string): string {
  if (status === 'IN_PLAY') return 'LIVE';
  if (status === 'PAUSED' || status === 'HALF_TIME') return 'HT';
  if (status === 'FINISHED') return 'FT';
  if (status === 'SCHEDULED') return 'SOON';
  return status;
}

function scoreIcon(correct: boolean | null | undefined): string {
  if (correct === null || correct === undefined) return '⏳';
  return correct ? '✅' : '❌';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GlassCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`border ${className}`}
      style={{
        background: 'rgba(0,0,0,0.40)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgba(255,255,255,0.10)',
        borderRadius: '12px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Skeleton({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return (
    <div
      className={`${h} ${w} rounded animate-pulse`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: '#FF2D55',
          boxShadow: '0 0 6px #FF2D55',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}
      />
      <span className="font-mono text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#FF2D55' }}>
        LIVE
      </span>
    </span>
  );
}

// Tactical pitch display — positions laid out top-to-bottom (GK at bottom)
function MiniPitch({ lineup }: { lineup: Lineup | null | undefined }) {
  const rows = React.useMemo(() => {
    if (!lineup?.startXI?.length) return [];
    const formation = lineup.formation || '';
    const nums = formation.split('-').map(Number).filter(Boolean);
    const players = [...(lineup.startXI || [])];
    const result: typeof players[] = [];
    let idx = 0;
    // GK
    result.push(players.slice(0, 1));
    idx = 1;
    for (const n of nums) {
      result.push(players.slice(idx, idx + n));
      idx += n;
    }
    return result.reverse(); // attackers on top
  }, [lineup]);

  if (!lineup || !rows.length) {
    return (
      <div className="flex items-center justify-center h-48 font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Lineup not yet confirmed
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,200,80,0.12) 0%, transparent 70%), rgba(0,100,40,0.25)',
        minHeight: 200,
        paddingBottom: '75%',
      }}
    >
      {/* Pitch lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-20 pointer-events-none">
        <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
        <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
        <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
      </div>
      {/* Player rows */}
      <div className="absolute inset-0 flex flex-col justify-around py-3 px-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-around">
            {row.map((p, pi) => (
              <div key={pi} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[9px] font-bold"
                  style={{ background: 'rgba(0,255,133,0.18)', border: '1px solid rgba(0,255,133,0.4)', color: '#00FF85' }}
                >
                  {p.number ?? (pi + 1)}
                </div>
                <span className="font-sans text-[8px] text-center leading-tight" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 36, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {(p.name || '').split(' ').pop()}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Animated momentum bar
function MomentumMeter({
  home, away, homePct, awayPct, primary,
}: {
  home: string; away: string; homePct: number; awayPct: number; primary: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-sans font-semibold text-[12px]" style={{ color: 'var(--text)' }}>{home}</span>
        <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>Momentum</span>
        <span className="font-sans font-semibold text-[12px]" style={{ color: 'var(--text)' }}>{away}</span>
      </div>
      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full transition-all duration-1000 ease-in-out rounded-full"
          style={{
            width: `${homePct}%`,
            background: `linear-gradient(90deg, ${primary}, rgba(0,255,133,0.6))`,
          }}
        />
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-[11px] font-bold" style={{ color: primary }}>{homePct}%</span>
        <span className="font-mono text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{awayPct}%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LiveMatchPage() {
  const params = useParams();
  const matchId = Number(params?.matchId);
  const { primary } = useTheme();
  const { user, token, authFetch } = useAuth();

  const [connected, setConnected] = useState(false);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lineups, setLineups] = useState<Lineups>({});
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [myScore, setMyScore] = useState<MyScore | null>(null);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [scoreFlash, setScoreFlash] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const prevGoals = useRef<{ home?: number; away?: number }>({});

  // ── REST fetches (lineups + pulse + my-score) ──────────────────────────
  const fetchRest = useCallback(async () => {
    try {
      const [lineupsRes, pulseRes, eventsRes] = await Promise.all([
        fetch(`${API}/matches/${matchId}/lineups`),
        fetch(`${API}/matches/${matchId}/pulse`),
        fetch(`${API}/matches/${matchId}/events`),
      ]);
      if (lineupsRes.ok) setLineups(await lineupsRes.json());
      if (pulseRes.ok) setPulse(await pulseRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch { /* non-fatal */ }

    if (user && token) {
      try {
        const res = await authFetch(`${API}/predictions/matches/${matchId}/my-score`);
        if (res.ok) setMyScore(await res.json());
      } catch { /* not locked */ }
    }
  }, [matchId, user, token, authFetch]);

  // ── WebSocket ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;

    fetchRest();

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/ws/match/${matchId}`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          handleMessage(msg);
        } catch { /* ignore malformed */ }
      };
    };

    connect();
    return () => {
      wsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  function handleMessage(msg: { type: string; data: unknown }) {
    switch (msg.type) {
      case 'state':
      case 'stats_update': {
        const state = msg.data as MatchState;
        setMatchState(prev => ({ ...prev, ...state }));
        break;
      }
      case 'score_update':
      case 'goal': {
        const d = msg.data as { home_goals?: number; away_goals?: number; scorer?: string; team?: string; minute?: number };
        const ph = prevGoals.current.home;
        const pa = prevGoals.current.away;
        if (d.home_goals !== ph || d.away_goals !== pa) {
          setScoreFlash(true);
          setTimeout(() => setScoreFlash(false), 1200);
          prevGoals.current = { home: d.home_goals, away: d.away_goals };
        }
        setMatchState(prev => prev ? {
          ...prev,
          home_goals: d.home_goals ?? prev.home_goals,
          away_goals: d.away_goals ?? prev.away_goals,
        } : prev);
        // Refresh events + my-score on goal
        fetchRest();
        break;
      }
      case 'commentary': {
        const c = msg.data as unknown as Commentary;
        setCommentary(prev => [...prev.slice(-9), c]);
        break;
      }
    }
  }

  // ── Ping keepalive ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────
  const isLive = matchState?.status === 'IN_PLAY' || matchState?.status === 'PAUSED' || matchState?.status === 'HALF_TIME';
  const homeTeam = matchState?.home_team ?? 'Home';
  const awayTeam = matchState?.away_team ?? 'Away';
  const homeGoals = matchState?.home_goals ?? 0;
  const awayGoals = matchState?.away_goals ?? 0;
  const momentum = matchState?.momentum ?? { home_pct: 50, away_pct: 50 };

  // Determine which side is dominant for the active lineup display
  const activeLineup = lineups.home || lineups.away;

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (!matchState && !connected) {
    return (
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        <NavBar subtitle="LIVE" />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px' }}>
          <div className="flex flex-col gap-6">
            <Skeleton h="h-24" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Skeleton h="h-64" />
              <Skeleton h="h-64" />
              <Skeleton h="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes scoreBounce { 0%,100% { transform: scale(1) } 30% { transform: scale(1.25) } 60% { transform: scale(0.95) } }
      `}</style>

      <NavBar subtitle="LIVE" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ── HERO SCOREBOARD ── */}
        <GlassCard className="mb-5 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">

            {/* Match meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                {isLive ? <LiveDot /> : (
                  <span className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--muted)' }}>
                    {statusLabel(matchState?.status ?? '')}
                  </span>
                )}
                {matchState?.minute && isLive && (
                  <span className="font-mono text-[11px] font-bold" style={{ color: '#FF2D55' }}>
                    {matchState.minute}&apos;
                  </span>
                )}
                {!connected && (
                  <span className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>
                    reconnecting…
                  </span>
                )}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
                {matchState?.venue ?? '—'}
              </p>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl leading-none">{matchState?.home_flag ?? '🏳️'}</span>
                <span className="font-sans font-semibold text-[14px] sm:text-[16px]" style={{ color: 'var(--text)' }}>
                  {homeTeam}
                </span>
              </div>

              <div
                className="font-display leading-none tabular-nums"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                  color: 'var(--text)',
                  animation: scoreFlash ? 'scoreBounce 0.6s ease' : 'none',
                  minWidth: 100,
                  textAlign: 'center',
                }}
              >
                {homeGoals} – {awayGoals}
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-sans font-semibold text-[14px] sm:text-[16px]" style={{ color: 'var(--text)' }}>
                  {awayTeam}
                </span>
                <span className="text-2xl sm:text-3xl leading-none">{matchState?.away_flag ?? '🏳️'}</span>
              </div>
            </div>

            <div className="flex-1" />
          </div>
        </GlassCard>

        {/* ── ROW 1: Events / Pitch / Momentum ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* LIVE EVENTS FEED */}
          <GlassCard className="p-5 flex flex-col gap-3" style={{ minHeight: 280 }}>
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
              Live Events
            </h3>
            {events.length === 0 ? (
              <p className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                No events yet
              </p>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 280 }}>
                {[...events].reverse().map((evt, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)', minWidth: 28 }}>
                      {evt.minute ?? '—'}&apos;
                    </span>
                    <span className="text-base leading-none flex-shrink-0">{eventIcon(evt)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-semibold text-[13px] leading-tight" style={{ color: 'var(--text)' }}>
                        {eventLabel(evt)}
                      </p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                        {evt.team}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* TACTICAL PITCH */}
          <GlassCard className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
                Tactical Pitch
              </h3>
              {activeLineup?.formation && (
                <span className="font-mono text-[10px] px-2 py-0.5 border" style={{ color: primary, borderColor: `color-mix(in srgb, ${primary} 30%, transparent)` }}>
                  {activeLineup.formation}
                </span>
              )}
            </div>
            <MiniPitch lineup={activeLineup} />
            {activeLineup?.team && (
              <p className="font-mono text-[10px] text-center" style={{ color: 'var(--muted)' }}>{activeLineup.team}</p>
            )}
          </GlassCard>

          {/* MOMENTUM METER */}
          <GlassCard className="p-5 flex flex-col gap-5">
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
              Momentum
            </h3>
            <MomentumMeter
              home={homeTeam}
              away={awayTeam}
              homePct={momentum.home_pct}
              awayPct={momentum.away_pct}
              primary={primary}
            />

            {/* Stats from momentum breakdown */}
            <div className="flex flex-col gap-2 mt-2">
              {[
                { label: 'Possession', home: momentum.home_pct, away: momentum.away_pct },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] w-16 text-right" style={{ color: primary }}>{stat.home}%</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full transition-all duration-700" style={{ width: `${stat.home}%`, background: primary }} />
                  </div>
                  <span className="font-mono text-[10px] w-10" style={{ color: 'var(--muted)' }}>{stat.away}%</span>
                </div>
              ))}
            </div>

            <p className="font-mono text-[9px] text-center mt-auto" style={{ color: 'rgba(255,255,255,0.15)' }}>
              Updates every 60s
            </p>
          </GlassCard>
        </div>

        {/* ── ROW 2: My Prediction vs Reality / Global Pulse ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* MY PREDICTION */}
          <GlassCard className="p-5 flex flex-col gap-4">
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
              Your Prediction vs Reality
            </h3>

            {!user ? (
              <p className="font-sans text-[14px]" style={{ color: 'var(--muted)' }}>
                Log in to see your scorecard
              </p>
            ) : !myScore ? (
              <p className="font-sans text-[14px]" style={{ color: 'var(--muted)' }}>
                No prediction locked for this match
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Formation match', icon: scoreIcon(myScore.formation_correct), pts: myScore.formation_pts },
                    { label: 'First scorer',    icon: scoreIcon(myScore.captain_correct),   pts: myScore.captain_pts + myScore.first_scorer_pts },
                    { label: 'Match result',    icon: scoreIcon(myScore.result_correct),     pts: myScore.result_pts },
                    { label: 'Clean sheet',     icon: myScore.clean_sheet_pts > 0 ? '✅' : '⏳', pts: myScore.clean_sheet_pts },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{row.icon}</span>
                        <span className="font-sans text-[14px]" style={{ color: 'var(--text)' }}>{row.label}</span>
                      </div>
                      <span
                        className="font-mono text-[11px] font-bold px-2 py-0.5"
                        style={{
                          color: row.pts > 0 ? 'var(--success)' : 'var(--muted)',
                          background: row.pts > 0 ? 'rgba(0,255,133,0.08)' : 'transparent',
                        }}
                      >
                        {row.pts > 0 ? `+${row.pts}pts` : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div>
                    <p className="font-display" style={{ fontSize: '2rem', color: primary, lineHeight: 1 }}>
                      {myScore.total_pts}pts
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                      Current score
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)', lineHeight: 1 }}>
                      #{myScore.current_rank}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                      of {myScore.total_scouts.toLocaleString()} scouts
                    </p>
                  </div>
                </div>
              </>
            )}
          </GlassCard>

          {/* GLOBAL SCOUT PULSE */}
          <GlassCard className="p-5 flex flex-col gap-4">
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
              Global Scout Pulse
            </h3>

            {!pulse ? (
              <div className="flex flex-col gap-2">
                <Skeleton h="h-4" w="w-3/4" />
                <Skeleton h="h-4" w="w-1/2" />
                <Skeleton h="h-4" w="w-2/3" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-[2rem] leading-none" style={{ color: primary }}>
                    {pulse.total_scouts.toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>
                    scouts watching
                  </span>
                </div>

                {/* Result split */}
                <div className="flex flex-col gap-2">
                  {(['home', 'draw', 'away'] as const).map(r => {
                    const pct = pulse.result_split?.[r] ?? 0;
                    const label = r === 'home' ? homeTeam : r === 'away' ? awayTeam : 'Draw';
                    return (
                      <div key={r} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] w-20 truncate" style={{ color: 'var(--text)' }}>{label}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: r === 'home' ? primary : r === 'draw' ? 'var(--gold)' : 'rgba(255,255,255,0.3)' }}
                          />
                        </div>
                        <span className="font-mono text-[10px] font-bold w-8 text-right" style={{ color: 'var(--muted)' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                {pulse.top_captain && (
                  <div className="border-t pt-3 flex flex-col gap-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <p className="font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
                      Top scorer pick
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-[14px]" style={{ color: 'var(--text)' }}>
                        {pulse.top_captain}
                      </span>
                      <span className="font-mono text-[11px] font-bold" style={{ color: primary }}>
                        {pulse.top_captain_pct}%
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </GlassCard>
        </div>

        {/* ── ROW 3: AI Tactical Pulse ── */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">⚡</span>
            <h3 className="font-sans font-semibold text-[15px] uppercase tracking-[1.5px]" style={{ color: 'var(--text)' }}>
              AI Tactical Pulse
            </h3>
            <span className="font-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
              Updates every 10 min
            </span>
          </div>

          {commentary.length === 0 ? (
            <p className="font-sans text-[14px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              AI commentary will appear here once the match kicks off.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {[...commentary].reverse().map((c, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-l-2 pl-4"
                  style={{ borderColor: i === 0 ? primary : 'rgba(255,255,255,0.1)' }}
                >
                  {c.minute && (
                    <span className="font-mono text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ color: i === 0 ? primary : 'var(--muted)' }}>
                      {c.minute}&apos;
                    </span>
                  )}
                  <p className="font-sans text-[14px] leading-relaxed" style={{ color: i === 0 ? 'var(--text)' : 'rgba(255,255,255,0.5)' }}>
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

      </div>
    </div>
  );
}
