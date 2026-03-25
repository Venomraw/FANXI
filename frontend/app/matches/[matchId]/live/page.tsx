'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import NavBar from '@/src/components/NavBar';
import ShareCardButton from '@/src/components/ShareCardButton';

const API    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL  || 'ws://localhost:8000';

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

interface Lineups { home?: Lineup | null; away?: Lineup | null; }

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

interface Commentary { id?: number; minute?: number; content: string; created_at?: string; }

// Score Reveal types
interface PlayerComparison {
  slot: string;
  name: string;
  position: string;
  correct: boolean | null;
}
interface RevealData {
  match_id: number;
  match_status: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  comparison: {
    correct_count: number;
    total_predicted: number;
    accuracy_pct: number;
    players: PlayerComparison[];
    formation_match: boolean;
    predicted_formation: string;
    actual_formation: string | null;
  };
  score_breakdown: {
    formation_pts: number;
    captain_pts: number;
    first_scorer_pts: number;
    result_pts: number;
    clean_sheet_pts: number;
    total_pts: number;
    result_correct: boolean | null;
    captain_correct: boolean;
  };
  rank: { current_rank: number | null; total_scouts: number; better_than_pct: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function eventIcon(evt: MatchEvent): string {
  if (evt.type === 'goal') return '⚽';
  if (evt.type === 'card') return evt.card_type?.includes('RED') ? '🟥' : '🟨';
  if (evt.type === 'sub') return '🔄';
  return '•';
}
function eventLabel(evt: MatchEvent): string {
  if (evt.type === 'goal') { let s = evt.scorer || 'Unknown'; if (evt.assist) s += ` (ast. ${evt.assist})`; return s; }
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

function getGrade(accuracyPct: number, totalPts: number): { grade: string; label: string; color: string } {
  if (accuracyPct >= 90 || totalPts >= 70) return { grade: 'S', label: 'LEGENDARY SCOUT',   color: '#FFD23F' };
  if (accuracyPct >= 75 || totalPts >= 50) return { grade: 'A', label: 'ELITE TACTICIAN',   color: '#00FF85' };
  if (accuracyPct >= 60 || totalPts >= 30) return { grade: 'B', label: 'SHARP ANALYST',     color: '#00D1FF' };
  if (accuracyPct >= 45 || totalPts >= 15) return { grade: 'C', label: 'DECENT READ',       color: '#C084FC' };
  return                                          { grade: 'D', label: 'BACK TO TRAINING',  color: '#FF6B6B' };
}

// ---------------------------------------------------------------------------
// Glass card / skeleton / misc sub-components
// ---------------------------------------------------------------------------

function GlassCard({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`border ${className}`} style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.10)', borderRadius: '12px', ...style }}>
      {children}
    </div>
  );
}
function Skeleton({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} rounded animate-pulse`} style={{ background: 'rgba(255,255,255,0.06)' }} />;
}
function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: '#FF2D55', boxShadow: '0 0 6px #FF2D55', animation: 'livepulse 1.4s ease-in-out infinite' }} />
      <span className="font-mono text-xs font-bold uppercase tracking-[2px]" style={{ color: '#FF2D55' }}>LIVE</span>
    </span>
  );
}
function MiniPitch({ lineup }: { lineup: Lineup | null | undefined }) {
  const rows = React.useMemo(() => {
    if (!lineup?.startXI?.length) return [];
    const nums = (lineup.formation || '').split('-').map(Number).filter(Boolean);
    const players = [...(lineup.startXI || [])];
    const result: typeof players[] = [];
    let idx = 0;
    result.push(players.slice(0, 1));
    idx = 1;
    for (const n of nums) { result.push(players.slice(idx, idx + n)); idx += n; }
    return result.reverse();
  }, [lineup]);
  if (!lineup || !rows.length) return <div className="flex items-center justify-center h-48 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Lineup not yet confirmed</div>;
  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,200,80,0.12) 0%, transparent 70%), rgba(0,100,40,0.25)', paddingBottom: '75%' }}>
      <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-20 pointer-events-none">
        {[0,1,2].map(i => <div key={i} className="h-px w-full" style={{ background: 'rgba(255,255,255,0.4)' }} />)}
      </div>
      <div className="absolute inset-0 flex flex-col justify-around py-3 px-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-around">
            {row.map((p, pi) => (
              <div key={pi} className="flex flex-col items-center gap-0.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold" style={{ background: 'rgba(0,255,133,0.18)', border: '1px solid rgba(0,255,133,0.4)', color: '#00FF85' }}>
                  {p.number ?? (pi + 1)}
                </div>
                <span className="font-sans text-xs text-center leading-tight" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 36, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
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
function MomentumMeter({ home, away, homePct, awayPct, primary }: { home: string; away: string; homePct: number; awayPct: number; primary: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-sans font-semibold text-[12px]">{home}</span>
        <span className="font-mono text-xs uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>Momentum</span>
        <span className="font-sans font-semibold text-[12px]">{away}</span>
      </div>
      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full transition-all duration-1000 ease-in-out rounded-full" style={{ width: `${homePct}%`, background: `linear-gradient(90deg, ${primary}, rgba(0,255,133,0.6))` }} />
      </div>
      <div className="flex justify-between">
        <span className="font-mono text-xs font-bold" style={{ color: primary }}>{homePct}%</span>
        <span className="font-mono text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{awayPct}%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScoreReveal — cinematic full-screen overlay
// ---------------------------------------------------------------------------

function ScoreReveal({
  data, onClose, homeFlag, awayFlag, primary,
}: {
  data: RevealData;
  onClose: () => void;
  homeFlag: string;
  awayFlag: string;
  primary: string;
}) {
  const [phase, setPhase]       = useState(0);
  const [displayPts, setDisplayPts] = useState(0);
  const [copied, setCopied]     = useState(false);
  const { grade, label: gradeLabel, color: gradeColor } = getGrade(
    data.comparison.accuracy_pct,
    data.score_breakdown.total_pts,
  );
  const bd = data.score_breakdown;
  const cm = data.comparison;

  // Phase sequencer
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // FULL TIME
      setTimeout(() => setPhase(2), 900),   // Score
      setTimeout(() => setPhase(3), 1600),  // Grade reveal
      setTimeout(() => setPhase(4), 2200),  // Player grid
      setTimeout(() => setPhase(5), 3800),  // Accuracy bar
      setTimeout(() => setPhase(6), 4600),  // Breakdown cards
      setTimeout(() => setPhase(7), 5400),  // IQ counter starts
      setTimeout(() => setPhase(8), 7200),  // Rank + buttons
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // IQ counter
  useEffect(() => {
    if (phase < 7) return;
    const target = bd.total_pts;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const iv = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayPts(current);
      if (current >= target) clearInterval(iv);
    }, 35);
    return () => clearInterval(iv);
  }, [phase, bd.total_pts]);

  const handleShare = () => {
    const txt = `I scored ${bd.total_pts} IQ pts on ${data.home_team} vs ${data.away_team} on FanXI! ${cm.correct_count}/${cm.total_predicted} players correct (${cm.accuracy_pct}%) — Grade ${grade}. Can you beat me? fanxi.app`;
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const vis = (minPhase: number, extra?: React.CSSProperties): React.CSSProperties => ({
    opacity:    phase >= minPhase ? 1 : 0,
    transform:  phase >= minPhase ? 'translateY(0)' : 'translateY(18px)',
    transition: 'opacity 0.55s ease, transform 0.55s ease',
    ...extra,
  });

  const breakdownItems = [
    { label: 'FORMATION',    pts: bd.formation_pts,    correct: cm.formation_match     },
    { label: 'FIRST SCORER', pts: bd.captain_pts + bd.first_scorer_pts, correct: bd.captain_correct },
    { label: 'RESULT',       pts: bd.result_pts,       correct: bd.result_correct === true },
    { label: 'CLEAN SHEET',  pts: bd.clean_sheet_pts,  correct: bd.clean_sheet_pts > 0 },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(6,10,6,0.98) 0%, rgba(0,0,0,0.99) 100%)',
        backdropFilter: 'blur(40px)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '24px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 660, width: '100%' }}>

        {/* ── FULL TIME ── */}
        <div className="text-center mb-8" style={vis(1)}>
          <div
            className="font-display font-semibold"
            style={{ fontSize: 'clamp(72px, 14vw, 120px)', letterSpacing: '-3px', lineHeight: 0.9, color: 'rgba(255,255,255,0.08)' }}
          >
            FULL<br />TIME
          </div>
        </div>

        {/* ── SCORE ── */}
        <div className="flex items-center justify-center gap-6 mb-10" style={vis(2)}>
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: '2.5rem' }}>{homeFlag}</span>
            <span className="font-sans font-semibold text-[13px]" style={{ color: 'var(--muted)' }}>{data.home_team}</span>
          </div>
          <div
            className="font-display font-semibold tabular-nums"
            style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', color: 'var(--text)', lineHeight: 1, letterSpacing: '-2px' }}
          >
            {data.home_score} – {data.away_score}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span style={{ fontSize: '2.5rem' }}>{awayFlag}</span>
            <span className="font-sans font-semibold text-[13px]" style={{ color: 'var(--muted)' }}>{data.away_team}</span>
          </div>
        </div>

        {/* ── GRADE ── */}
        <div className="flex flex-col items-center gap-2 mb-10" style={vis(3)}>
          <div
            className="font-display font-semibold"
            style={{
              fontSize: 'clamp(80px, 18vw, 140px)',
              color: gradeColor,
              lineHeight: 0.85,
              filter: `drop-shadow(0 0 40px ${gradeColor})`,
              animation: phase >= 3 ? 'gradeGlow 2s ease-in-out infinite alternate' : 'none',
            }}
          >
            {grade}
          </div>
          <div
            className="font-mono font-bold tracking-[3px] uppercase"
            style={{ fontSize: '12px', color: gradeColor, letterSpacing: '4px' }}
          >
            {gradeLabel}
          </div>
        </div>

        {/* ── PLAYER GRID ── */}
        <div className="mb-4" style={vis(4)}>
          <div className="font-mono text-xs tracking-widest uppercase mb-3 text-center" style={{ color: 'var(--muted)' }}>
            Your Starting XI
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
            {cm.players.map((p, i) => (
              <div
                key={i}
                style={{
                  opacity: phase >= 4 ? 1 : 0,
                  animation: phase >= 4 ? `slotReveal 0.35s ease ${i * 0.06}s both` : 'none',
                  background: p.correct === true
                    ? 'rgba(0,255,133,0.10)'
                    : p.correct === false
                    ? 'rgba(255,45,85,0.10)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.correct === true ? 'rgba(0,255,133,0.35)' : p.correct === false ? 'rgba(255,45,85,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  padding: '8px',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <div
                  className="text-base mb-1"
                  style={{ filter: p.correct === true ? 'drop-shadow(0 0 8px #00FF85)' : 'none' }}
                >
                  {p.correct === true ? '✅' : p.correct === false ? '❌' : '⏳'}
                </div>
                <div className="font-mono text-xs tracking-widest uppercase mb-0.5" style={{ color: 'var(--muted)' }}>
                  {p.position || p.slot}
                </div>
                <div className="font-sans font-semibold text-xs leading-tight" style={{ color: 'var(--text)' }}>
                  {(p.name || '').split(' ').pop()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACCURACY BAR ── */}
        <div className="mb-8" style={vis(5)}>
          <div className="flex items-end justify-between mb-2">
            <span className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
              Players Correct
            </span>
            <span className="font-display font-semibold" style={{ fontSize: '28px', color: gradeColor }}>
              {cm.correct_count}/{cm.total_predicted}
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
            <div
              style={{
                height: '100%',
                width: phase >= 5 ? `${cm.accuracy_pct}%` : '0%',
                background: `linear-gradient(90deg, ${gradeColor}, color-mix(in srgb, ${gradeColor} 60%, transparent))`,
                transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
                boxShadow: `0 0 12px ${gradeColor}`,
                borderRadius: '2px',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>0%</span>
            <span className="font-mono text-[13px] font-bold" style={{ color: gradeColor }}>{cm.accuracy_pct}%</span>
          </div>

          {/* Formation badge */}
          <div className="flex items-center gap-3 mt-3 justify-center flex-wrap">
            <span className="font-mono text-xs tracking-widest uppercase px-3 py-1" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
              You predicted: {cm.predicted_formation || '—'}
            </span>
            {cm.actual_formation && (
              <span
                className="font-mono text-xs tracking-widest uppercase px-3 py-1"
                style={{
                  color: cm.formation_match ? '#00FF85' : '#FF6B6B',
                  border: `1px solid ${cm.formation_match ? 'rgba(0,255,133,0.3)' : 'rgba(255,107,107,0.3)'}`,
                  background: cm.formation_match ? 'rgba(0,255,133,0.06)' : 'rgba(255,107,107,0.06)',
                }}
              >
                {cm.formation_match ? '✓ ' : '✗ '}Actual: {cm.actual_formation}
              </span>
            )}
          </div>
        </div>

        {/* ── BREAKDOWN CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10" style={vis(6)}>
          {breakdownItems.map((item, i) => (
            <div
              key={i}
              style={{
                opacity: phase >= 6 ? 1 : 0,
                animation: phase >= 6 ? `slotReveal 0.4s ease ${i * 0.08}s both` : 'none',
                background: item.pts > 0
                  ? 'rgba(0,255,133,0.07)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${item.pts > 0 ? 'rgba(0,255,133,0.25)' : 'rgba(255,255,255,0.08)'}`,
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                {item.correct ? '✅' : '❌'}
              </div>
              <div className="font-mono text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--muted)' }}>
                {item.label}
              </div>
              <div
                className="font-display font-semibold"
                style={{ fontSize: '20px', color: item.pts > 0 ? '#00FF85' : 'rgba(255,255,255,0.2)' }}
              >
                {item.pts > 0 ? `+${item.pts}` : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* ── IQ TOTAL ── */}
        <div className="text-center mb-10" style={vis(7)}>
          <div className="font-mono text-xs tracking-[4px] uppercase mb-3" style={{ color: 'var(--muted)' }}>
            IQ Points Awarded
          </div>
          <div
            className="font-display font-semibold"
            style={{
              fontSize: 'clamp(80px, 16vw, 128px)',
              color: gradeColor,
              lineHeight: 0.85,
              letterSpacing: '-3px',
              filter: `drop-shadow(0 0 30px ${gradeColor})`,
              animation: phase >= 7 ? 'iqGlow 1.5s ease-in-out infinite alternate' : 'none',
            }}
          >
            +{displayPts}
          </div>
          <div className="font-mono text-[12px] tracking-widest uppercase mt-2" style={{ color: gradeColor, opacity: 0.7 }}>
            pts
          </div>
        </div>

        {/* ── RANK ── */}
        <div className="text-center mb-8" style={vis(8)}>
          <div
            className="inline-flex flex-col items-center gap-2 px-8 py-5 border"
            style={{
              background: 'rgba(0,0,0,0.5)',
              borderColor: `color-mix(in srgb, ${primary} 30%, transparent)`,
              borderRadius: '12px',
            }}
          >
            <div className="font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
              Global Rank
            </div>
            <div className="font-display font-semibold" style={{ fontSize: 'clamp(32px, 6vw, 52px)', color: primary, lineHeight: 1 }}>
              #{data.rank.current_rank ?? '—'}
            </div>
            <div className="font-sans text-[13px]" style={{ color: 'var(--muted)' }}>
              of {data.rank.total_scouts.toLocaleString()} scouts worldwide
            </div>
            <div
              className="font-mono text-xs tracking-widest uppercase px-3 py-1"
              style={{
                background: `color-mix(in srgb, ${gradeColor} 12%, transparent)`,
                color: gradeColor,
                border: `1px solid color-mix(in srgb, ${gradeColor} 30%, transparent)`,
                borderRadius: '4px',
              }}
            >
              Better than {data.rank.better_than_pct}% of scouts
            </div>
          </div>
        </div>

        {/* ── BUTTONS ── */}
        <div className="flex gap-3 justify-center flex-wrap" style={vis(8)}>
          <button
            onClick={handleShare}
            className="font-sans font-semibold text-[13px] px-7 py-3.5 transition-all hover:-translate-y-0.5"
            style={{ background: gradeColor, color: '#060A06', borderRadius: '6px', boxShadow: `0 0 20px color-mix(in srgb, ${gradeColor} 40%, transparent)` }}
          >
            {copied ? '✓ Copied!' : 'Share Result'}
          </button>
          <button
            onClick={onClose}
            className="font-sans font-semibold text-[13px] px-7 py-3.5 transition-all border"
            style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'transparent', borderRadius: '6px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = primary; (e.currentTarget as HTMLButtonElement).style.color = primary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
          >
            View Full Stats
          </button>
        </div>

      </div>

      <style>{`
        @keyframes gradeGlow {
          from { filter: drop-shadow(0 0 20px currentColor); }
          to   { filter: drop-shadow(0 0 60px currentColor); }
        }
        @keyframes iqGlow {
          from { filter: drop-shadow(0 0 15px currentColor); }
          to   { filter: drop-shadow(0 0 50px currentColor); }
        }
        @keyframes slotReveal {
          from { opacity: 0; transform: scale(0.6) rotateY(60deg); }
          to   { opacity: 1; transform: scale(1) rotateY(0deg); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LiveMatchPage() {
  const params  = useParams();
  const matchId = Number(params?.matchId);
  const { primary } = useTheme();
  const { user, token, authFetch } = useAuth();

  const [connected,   setConnected]   = useState(false);
  const [matchState,  setMatchState]  = useState<MatchState | null>(null);
  const [events,      setEvents]      = useState<MatchEvent[]>([]);
  const [lineups,     setLineups]     = useState<Lineups>({});
  const [pulse,       setPulse]       = useState<Pulse | null>(null);
  const [myScore,     setMyScore]     = useState<MyScore | null>(null);
  const [commentary,  setCommentary]  = useState<Commentary[]>([]);
  const [scoreFlash,  setScoreFlash]  = useState(false);

  // Reveal state
  const [showReveal,   setShowReveal]   = useState(false);
  const [revealData,   setRevealData]   = useState<RevealData | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);

  const wsRef     = useRef<WebSocket | null>(null);
  const prevGoals = useRef<{ home?: number; away?: number }>({});

  const fetchRest = useCallback(async () => {
    try {
      const [lineupsRes, pulseRes, eventsRes] = await Promise.all([
        fetch(`${API}/matches/${matchId}/lineups`),
        fetch(`${API}/matches/${matchId}/pulse`),
        fetch(`${API}/matches/${matchId}/events`),
      ]);
      if (lineupsRes.ok) setLineups(await lineupsRes.json());
      if (pulseRes.ok)   setPulse(await pulseRes.json());
      if (eventsRes.ok)  setEvents(await eventsRes.json());
    } catch { /* non-fatal */ }

    if (user && token) {
      try {
        const res = await authFetch(`${API}/predictions/matches/${matchId}/my-score`);
        if (res.ok) setMyScore(await res.json());
      } catch { /* not locked */ }
    }
  }, [matchId, user, token, authFetch]);

  useEffect(() => {
    if (!matchId) return;
    fetchRest();
    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/ws/match/${matchId}`);
      wsRef.current = ws;
      ws.onopen  = () => setConnected(true);
      ws.onclose = () => { setConnected(false); setTimeout(connect, 5000); };
      ws.onmessage = (evt) => {
        try { handleMessage(JSON.parse(evt.data)); } catch { /* ignore */ }
      };
    };
    connect();
    return () => { wsRef.current?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  function handleMessage(msg: { type: string; data: unknown }) {
    switch (msg.type) {
      case 'state':
      case 'stats_update': {
        setMatchState(prev => ({ ...prev, ...(msg.data as MatchState) }));
        break;
      }
      case 'score_update':
      case 'goal': {
        const d = msg.data as { home_goals?: number; away_goals?: number };
        if (d.home_goals !== prevGoals.current.home || d.away_goals !== prevGoals.current.away) {
          setScoreFlash(true);
          setTimeout(() => setScoreFlash(false), 1200);
          prevGoals.current = { home: d.home_goals, away: d.away_goals };
        }
        setMatchState(prev => prev ? { ...prev, home_goals: d.home_goals ?? prev.home_goals, away_goals: d.away_goals ?? prev.away_goals } : prev);
        fetchRest();
        break;
      }
      case 'commentary': {
        setCommentary(prev => [...prev.slice(-9), msg.data as unknown as Commentary]);
        break;
      }
    }
  }

  useEffect(() => {
    const iv = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping');
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const openReveal = async () => {
    if (revealData) { setShowReveal(true); return; }
    setRevealLoading(true);
    try {
      const res = await authFetch(`${API}/predictions/matches/${matchId}/score-reveal`);
      if (res.ok) {
        const data = await res.json();
        setRevealData(data);
        setShowReveal(true);
      }
    } catch { /* backend unavailable */ } finally {
      setRevealLoading(false);
    }
  };

  const isLive     = matchState?.status === 'IN_PLAY' || matchState?.status === 'PAUSED' || matchState?.status === 'HALF_TIME';
  const isFinished = matchState?.status === 'FINISHED';
  const homeTeam   = matchState?.home_team ?? 'Home';
  const awayTeam   = matchState?.away_team ?? 'Away';
  const homeGoals  = matchState?.home_goals ?? 0;
  const awayGoals  = matchState?.away_goals ?? 0;
  const momentum   = matchState?.momentum ?? { home_pct: 50, away_pct: 50 };
  const activeLineup = lineups.home || lineups.away;

  if (!matchState && !connected) {
    return (
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        <NavBar subtitle="LIVE" />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px' }}>
          <div className="flex flex-col gap-6">
            <Skeleton h="h-24" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Skeleton h="h-64" /><Skeleton h="h-64" /><Skeleton h="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <style>{`
        @keyframes liveplus  { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes scoreBounce { 0%,100% { transform:scale(1) } 30% { transform:scale(1.25) } 60% { transform:scale(0.95) } }
        @keyframes ftPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,210,63,0.5) } 50% { box-shadow: 0 0 0 10px rgba(255,210,63,0) } }
      `}</style>

      {/* ── Score Reveal Overlay ── */}
      {showReveal && revealData && (
        <ScoreReveal
          data={revealData}
          onClose={() => setShowReveal(false)}
          homeFlag={matchState?.home_flag ?? '🏳️'}
          awayFlag={matchState?.away_flag ?? '🏳️'}
          primary={primary}
        />
      )}

      <NavBar subtitle={isFinished ? 'FT' : 'LIVE'} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ── HERO SCOREBOARD ── */}
        <GlassCard className="mb-5 p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                {isLive  ? <LiveDot /> : (
                  <span className="font-mono text-xs uppercase tracking-[2px]" style={{ color: isFinished ? 'var(--gold)' : 'var(--muted)' }}>
                    {statusLabel(matchState?.status ?? '')}
                  </span>
                )}
                {matchState?.minute && isLive && (
                  <span className="font-mono text-xs font-bold" style={{ color: '#FF2D55' }}>{matchState.minute}&apos;</span>
                )}
                {!connected && <span className="font-mono text-xs uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>reconnecting…</span>}
              </div>
              <p className="font-mono text-xs uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>
                {matchState?.venue ?? '—'}
              </p>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl leading-none">{matchState?.home_flag ?? '🏳️'}</span>
                <span className="font-sans font-semibold text-[14px] sm:text-[16px]">{homeTeam}</span>
              </div>
              <div
                className="font-display leading-none tabular-nums"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4rem)', color: 'var(--text)',
                  animation: scoreFlash ? 'scoreBounce 0.6s ease' : 'none',
                  minWidth: 100, textAlign: 'center',
                }}
              >
                {homeGoals} – {awayGoals}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-sans font-semibold text-[14px] sm:text-[16px]">{awayTeam}</span>
                <span className="text-2xl sm:text-3xl leading-none">{matchState?.away_flag ?? '🏳️'}</span>
              </div>
            </div>

            <div className="flex-1" />
          </div>
        </GlassCard>

        {/* ── FULL TIME REVEAL CTA ── */}
        {isFinished && user && myScore && (
          <div
            className="mb-5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border"
            style={{
              background: 'rgba(255,210,63,0.06)',
              borderColor: 'rgba(255,210,63,0.4)',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div>
              <div className="font-mono text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--gold)' }}>
                Match Over
              </div>
              <p className="font-sans font-semibold text-[15px]">
                Your prediction has been scored — ready to see how you did?
              </p>
            </div>
            <button
              onClick={openReveal}
              disabled={revealLoading}
              className="flex-shrink-0 font-sans font-semibold text-[14px] px-8 py-3.5 transition-all hover:-translate-y-0.5 disabled:opacity-60"
              style={{
                background: 'var(--gold)',
                color: '#060A06',
                borderRadius: '6px',
                boxShadow: '0 0 24px rgba(255,210,63,0.45)',
                animation: 'ftPulse 2s ease-in-out infinite',
                whiteSpace: 'nowrap',
              }}
            >
              {revealLoading ? 'Loading...' : revealData ? 'Replay Reveal' : '🏆 Reveal My Score'}
            </button>
          </div>
        )}

        {/* ── ROW 1: Events / Pitch / Momentum ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          <GlassCard className="p-5 flex flex-col gap-3" style={{ minHeight: 280 }}>
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>Live Events</h3>
            {events.length === 0 ? (
              <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>No events yet</p>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 280 }}>
                {[...events].reverse().map((evt, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)', minWidth: 28 }}>{evt.minute ?? '—'}&apos;</span>
                    <span className="text-base leading-none flex-shrink-0">{eventIcon(evt)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-semibold text-[13px] leading-tight">{eventLabel(evt)}</p>
                      <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{evt.team}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>Tactical Pitch</h3>
              {activeLineup?.formation && (
                <span className="font-mono text-xs px-2 py-0.5 border" style={{ color: primary, borderColor: `color-mix(in srgb, ${primary} 30%, transparent)` }}>{activeLineup.formation}</span>
              )}
            </div>
            <MiniPitch lineup={activeLineup} />
            {activeLineup?.team && <p className="font-mono text-xs text-center" style={{ color: 'var(--muted)' }}>{activeLineup.team}</p>}
          </GlassCard>

          <GlassCard className="p-5 flex flex-col gap-5">
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>Momentum</h3>
            <MomentumMeter home={homeTeam} away={awayTeam} homePct={momentum.home_pct} awayPct={momentum.away_pct} primary={primary} />
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs w-16 text-right" style={{ color: primary }}>{momentum.home_pct}%</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full transition-all duration-700" style={{ width: `${momentum.home_pct}%`, background: primary }} />
                </div>
                <span className="font-mono text-xs w-10" style={{ color: 'var(--muted)' }}>{momentum.away_pct}%</span>
              </div>
            </div>
            <p className="font-mono text-xs text-center mt-auto" style={{ color: 'rgba(255,255,255,0.15)' }}>Updates every 60s</p>
          </GlassCard>
        </div>

        {/* ── ROW 2: My Prediction / Global Pulse ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          <GlassCard className="p-5 flex flex-col gap-4">
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>Your Prediction vs Reality</h3>
            {!user ? (
              <p className="font-sans text-[14px]" style={{ color: 'var(--muted)' }}>Log in to see your scorecard</p>
            ) : !myScore ? (
              <p className="font-sans text-[14px]" style={{ color: 'var(--muted)' }}>No prediction locked for this match</p>
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
                        <span className="font-sans text-[14px]">{row.label}</span>
                      </div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5" style={{ color: row.pts > 0 ? 'var(--success)' : 'var(--muted)', background: row.pts > 0 ? 'rgba(0,255,133,0.08)' : 'transparent' }}>
                        {row.pts > 0 ? `+${row.pts}pts` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div>
                    <p className="font-display" style={{ fontSize: '2rem', color: primary, lineHeight: 1 }}>{myScore.total_pts}pts</p>
                    <p className="font-mono text-xs uppercase tracking-[1.5px] mt-0.5" style={{ color: 'var(--muted)' }}>Current score</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display" style={{ fontSize: '1.5rem', lineHeight: 1 }}>#{myScore.current_rank}</p>
                    <p className="font-mono text-xs uppercase tracking-[1.5px] mt-0.5" style={{ color: 'var(--muted)' }}>of {myScore.total_scouts.toLocaleString()} scouts</p>
                  </div>
                </div>
                <ShareCardButton
                  type="prediction"
                  matchId={matchId}
                  matchLabel={`${homeTeam} vs ${awayTeam}`}
                  size="sm"
                />
                {isFinished && (
                  <button onClick={openReveal} disabled={revealLoading} className="w-full py-2.5 font-sans font-semibold text-[13px] transition-all" style={{ background: `color-mix(in srgb, ${primary} 14%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)`, borderRadius: '6px' }}>
                    {revealLoading ? 'Loading…' : '🏆 See Full Reveal'}
                  </button>
                )}
              </>
            )}
          </GlassCard>

          <GlassCard className="p-5 flex flex-col gap-4">
            <h3 className="font-sans font-semibold text-[13px] uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>Global Scout Pulse</h3>
            {!pulse ? (
              <div className="flex flex-col gap-2"><Skeleton h="h-4" w="w-3/4" /><Skeleton h="h-4" w="w-1/2" /><Skeleton h="h-4" w="w-2/3" /></div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-[2rem] leading-none" style={{ color: primary }}>{pulse.total_scouts.toLocaleString()}</span>
                  <span className="font-mono text-xs uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>scouts watching</span>
                </div>
                <div className="flex flex-col gap-2">
                  {(['home', 'draw', 'away'] as const).map(r => {
                    const pct = pulse.result_split?.[r] ?? 0;
                    const lbl = r === 'home' ? homeTeam : r === 'away' ? awayTeam : 'Draw';
                    return (
                      <div key={r} className="flex items-center gap-2">
                        <span className="font-mono text-xs w-20 truncate">{lbl}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: r === 'home' ? primary : r === 'draw' ? 'var(--gold)' : 'rgba(255,255,255,0.3)' }} />
                        </div>
                        <span className="font-mono text-xs font-bold w-8 text-right" style={{ color: 'var(--muted)' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
                {pulse.top_captain && (
                  <div className="border-t pt-3 flex flex-col gap-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <p className="font-mono text-xs uppercase tracking-[1.5px]" style={{ color: 'var(--muted)' }}>Top scorer pick</p>
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-[14px]">{pulse.top_captain}</span>
                      <span className="font-mono text-xs font-bold" style={{ color: primary }}>{pulse.top_captain_pct}%</span>
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
            <h3 className="font-sans font-semibold text-[15px] uppercase tracking-[1.5px]">AI Tactical Pulse</h3>
            <span className="font-mono text-xs uppercase tracking-[1px] px-2 py-0.5" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>Updates every 10 min</span>
          </div>
          {commentary.length === 0 ? (
            <p className="font-sans text-[14px]" style={{ color: 'rgba(255,255,255,0.25)' }}>AI commentary will appear here once the match kicks off.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {[...commentary].reverse().map((c, i) => (
                <div key={i} className="flex gap-3 border-l-2 pl-4" style={{ borderColor: i === 0 ? primary : 'rgba(255,255,255,0.1)' }}>
                  {c.minute && <span className="font-mono text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: i === 0 ? primary : 'var(--muted)' }}>{c.minute}&apos;</span>}
                  <p className="font-sans text-[14px] leading-relaxed" style={{ color: i === 0 ? 'var(--text)' : 'rgba(255,255,255,0.5)' }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

      </div>
    </div>
  );
}
