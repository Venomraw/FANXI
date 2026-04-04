'use client';

import { forwardRef } from 'react';
import { getTeamInfo } from '@/src/data/wc2026Groups';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Matchup {
  teamA: string | null;
  teamB: string | null;
  winner: string | null;
}

export interface BracketShareCardProps {
  r32: Matchup[];   // 16 matches
  r16: Matchup[];   // 8 matches
  qf: Matchup[];    // 4 matches
  sf: Matchup[];    // 2 matches
  finalTeamA: string | null;
  finalTeamB: string | null;
  champion: string | null;
  inline?: boolean;
}

// ---------------------------------------------------------------------------
// Constants — 1600x900 (16:9)
// ---------------------------------------------------------------------------

const W = 1600;
const H = 900;

// Pill sizing
const PILL_W = 140;
const PILL_H = 28;
const MATCH_GAP = 4;
const MATCH_H = PILL_H * 2 + MATCH_GAP;

// 9 columns: R32 R16 QF SF FINAL SF QF R16 R32
const COL_X = [24, 192, 352, 502, 660, 828, 978, 1138, 1306];
const FINAL_COL = 4;

const ROUND_LABELS = ['R32', 'R16', 'QF', 'SF', 'FINAL', 'SF', 'QF', 'R16', 'R32'];

// Truncated display names for long team names
const SHORT_NAMES: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'Ivory Coast': "Côte d'Ivoire",
};

function displayName(team: string): string {
  return SHORT_NAMES[team] ?? team;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distributeY(count: number, totalH: number, topOffset: number): number[] {
  if (count === 0) return [];
  const available = totalH - topOffset;
  const spacing = available / count;
  return Array.from({ length: count }, (_, i) => topOffset + spacing * 0.5 + i * spacing);
}

// ---------------------------------------------------------------------------
// TeamPill — premium design
// ---------------------------------------------------------------------------

function TeamPill({
  team,
  isWinner,
  isLoser,
  style,
}: {
  team: string | null;
  isWinner: boolean;
  isLoser: boolean;
  style: React.CSSProperties;
}) {
  if (!team) {
    return (
      <div
        style={{
          ...style,
          width: PILL_W,
          height: PILL_H,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          fontSize: 11,
          color: 'rgba(255,255,255,0.12)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        TBD
      </div>
    );
  }

  const info = getTeamInfo(team);

  return (
    <div
      style={{
        ...style,
        width: PILL_W,
        height: PILL_H,
        background: isWinner ? '#1a1a2e' : isLoser ? '#0d0d1a' : 'rgba(255,255,255,0.06)',
        border: isWinner
          ? '1px solid #dc2626'
          : isLoser
          ? '1px solid #333'
          : '1px solid rgba(255,255,255,0.12)',
        borderLeft: isWinner ? '4px solid #dc2626' : undefined,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '0 8px',
        fontSize: 13,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: isWinner ? 700 : 400,
        color: isLoser ? 'rgba(255,255,255,0.35)' : '#eee',
        boxShadow: isWinner ? '0 0 10px rgba(220,38,38,0.15)' : 'none',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ flexShrink: 0, fontSize: 15, lineHeight: 1 }}>{info.flag}</span>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textDecoration: isLoser ? 'line-through' : 'none',
        }}
      >
        {displayName(team)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchBlock
// ---------------------------------------------------------------------------

function MatchBlock({
  matchup,
  x,
  y,
}: {
  matchup: Matchup;
  x: number;
  y: number;
}) {
  const topY = y - MATCH_H / 2;
  const hasResult = !!matchup.winner;
  return (
    <>
      <TeamPill
        team={matchup.teamA}
        isWinner={hasResult && matchup.winner === matchup.teamA}
        isLoser={hasResult && matchup.winner !== matchup.teamA}
        style={{ position: 'absolute', left: x, top: topY }}
      />
      <TeamPill
        team={matchup.teamB}
        isWinner={hasResult && matchup.winner === matchup.teamB}
        isLoser={hasResult && matchup.winner !== matchup.teamB}
        style={{ position: 'absolute', left: x, top: topY + PILL_H + MATCH_GAP }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// SVG connector lines — winner path red, loser path dim
// ---------------------------------------------------------------------------

interface ConnectorDef {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isWinnerPath: boolean;
}

function ConnectorLines({ lines }: { lines: ConnectorDef[] }) {
  return (
    <svg
      width={W}
      height={H}
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
    >
      {/* Draw loser paths first (behind) */}
      {lines
        .filter(l => !l.isWinnerPath)
        .map((p, i) => {
          const midX = (p.from.x + p.to.x) / 2;
          return (
            <path
              key={`l-${i}`}
              d={`M${p.from.x},${p.from.y} H${midX} V${p.to.y} H${p.to.x}`}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          );
        })}
      {/* Winner paths on top */}
      {lines
        .filter(l => l.isWinnerPath)
        .map((p, i) => {
          const midX = (p.from.x + p.to.x) / 2;
          return (
            <path
              key={`w-${i}`}
              d={`M${p.from.x},${p.from.y} H${midX} V${p.to.y} H${p.to.x}`}
              fill="none"
              stroke="rgba(220,38,38,0.4)"
              strokeWidth={2}
            />
          );
        })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const BracketShareCard = forwardRef<HTMLDivElement, BracketShareCardProps>(
  function BracketShareCard(
    { r32, r16, qf, sf, finalTeamA, finalTeamB, champion, inline },
    ref,
  ) {
    const leftR32 = r32.slice(0, 8);
    const rightR32 = r32.slice(8, 16);
    const leftR16 = r16.slice(0, 4);
    const rightR16 = r16.slice(4, 8);
    const leftQF = qf.slice(0, 2);
    const rightQF = qf.slice(2, 4);
    const leftSF = sf.slice(0, 1);
    const rightSF = sf.slice(1, 2);

    const TOP = 80;
    const AREA_H = H - 24;

    const leftR32Y = distributeY(8, AREA_H, TOP);
    const rightR32Y = distributeY(8, AREA_H, TOP);
    const leftR16Y = distributeY(4, AREA_H, TOP);
    const rightR16Y = distributeY(4, AREA_H, TOP);
    const leftQFY = distributeY(2, AREA_H, TOP);
    const rightQFY = distributeY(2, AREA_H, TOP);
    const leftSFY = distributeY(1, AREA_H, TOP);
    const rightSFY = distributeY(1, AREA_H, TOP);
    const finalY = (AREA_H + TOP) / 2 - 50;

    // -------------------------------------------
    // Build connector lines with winner tracking
    // -------------------------------------------
    const lines: ConnectorDef[] = [];

    // Helper: does a matchup's winner equal a specific team?
    const isWin = (matchups: Matchup[], idx: number, side: 'A' | 'B'): boolean => {
      const m = matchups[idx];
      if (!m?.winner) return false;
      return side === 'A' ? m.winner === m.teamA : m.winner === m.teamB;
    };

    // Left R32→R16
    for (let i = 0; i < 4; i++) {
      lines.push({
        from: { x: COL_X[0] + PILL_W + 4, y: leftR32Y[i * 2] },
        to: { x: COL_X[1] - 4, y: leftR16Y[i] },
        isWinnerPath: isWin(leftR32, i * 2, 'A') || isWin(leftR32, i * 2, 'B'),
      });
      lines.push({
        from: { x: COL_X[0] + PILL_W + 4, y: leftR32Y[i * 2 + 1] },
        to: { x: COL_X[1] - 4, y: leftR16Y[i] },
        isWinnerPath: isWin(leftR32, i * 2 + 1, 'A') || isWin(leftR32, i * 2 + 1, 'B'),
      });
    }
    // Left R16→QF
    for (let i = 0; i < 2; i++) {
      lines.push({
        from: { x: COL_X[1] + PILL_W + 4, y: leftR16Y[i * 2] },
        to: { x: COL_X[2] - 4, y: leftQFY[i] },
        isWinnerPath: !!leftR16[i * 2]?.winner,
      });
      lines.push({
        from: { x: COL_X[1] + PILL_W + 4, y: leftR16Y[i * 2 + 1] },
        to: { x: COL_X[2] - 4, y: leftQFY[i] },
        isWinnerPath: !!leftR16[i * 2 + 1]?.winner,
      });
    }
    // Left QF→SF
    lines.push({
      from: { x: COL_X[2] + PILL_W + 4, y: leftQFY[0] },
      to: { x: COL_X[3] - 4, y: leftSFY[0] },
      isWinnerPath: !!leftQF[0]?.winner,
    });
    lines.push({
      from: { x: COL_X[2] + PILL_W + 4, y: leftQFY[1] },
      to: { x: COL_X[3] - 4, y: leftSFY[0] },
      isWinnerPath: !!leftQF[1]?.winner,
    });
    // Left SF→Final
    lines.push({
      from: { x: COL_X[3] + PILL_W + 4, y: leftSFY[0] },
      to: { x: COL_X[4] - 4, y: finalY + PILL_H / 2 },
      isWinnerPath: !!leftSF[0]?.winner,
    });

    // Right R32→R16
    for (let i = 0; i < 4; i++) {
      lines.push({
        from: { x: COL_X[8] - 4, y: rightR32Y[i * 2] },
        to: { x: COL_X[7] + PILL_W + 4, y: rightR16Y[i] },
        isWinnerPath: !!rightR32[i * 2]?.winner,
      });
      lines.push({
        from: { x: COL_X[8] - 4, y: rightR32Y[i * 2 + 1] },
        to: { x: COL_X[7] + PILL_W + 4, y: rightR16Y[i] },
        isWinnerPath: !!rightR32[i * 2 + 1]?.winner,
      });
    }
    // Right R16→QF
    for (let i = 0; i < 2; i++) {
      lines.push({
        from: { x: COL_X[7] - 4, y: rightR16Y[i * 2] },
        to: { x: COL_X[6] + PILL_W + 4, y: rightQFY[i] },
        isWinnerPath: !!rightR16[i * 2]?.winner,
      });
      lines.push({
        from: { x: COL_X[7] - 4, y: rightR16Y[i * 2 + 1] },
        to: { x: COL_X[6] + PILL_W + 4, y: rightQFY[i] },
        isWinnerPath: !!rightR16[i * 2 + 1]?.winner,
      });
    }
    // Right QF→SF
    lines.push({
      from: { x: COL_X[6] - 4, y: rightQFY[0] },
      to: { x: COL_X[5] + PILL_W + 4, y: rightSFY[0] },
      isWinnerPath: !!rightQF[0]?.winner,
    });
    lines.push({
      from: { x: COL_X[6] - 4, y: rightQFY[1] },
      to: { x: COL_X[5] + PILL_W + 4, y: rightSFY[0] },
      isWinnerPath: !!rightQF[1]?.winner,
    });
    // Right SF→Final
    lines.push({
      from: { x: COL_X[5] - 4, y: rightSFY[0] },
      to: { x: COL_X[4] + PILL_W + 4, y: finalY + PILL_H + MATCH_GAP + PILL_H / 2 },
      isWinnerPath: !!rightSF[0]?.winner,
    });

    // -------------------------------------------
    // Render
    // -------------------------------------------

    const champInfo = champion ? getTeamInfo(champion) : null;
    const champW = 220;
    const champH = 100;
    const champX = COL_X[FINAL_COL] + (PILL_W - champW) / 2;
    const champY = finalY + MATCH_H + 24;

    return (
      <div
        ref={ref}
        style={{
          position: inline ? 'relative' : 'absolute',
          left: inline ? undefined : -9999,
          top: inline ? undefined : 0,
          width: W,
          height: H,
          // Radial gradient background
          background: 'radial-gradient(ellipse at center, #0f1729 0%, #050810 100%)',
          color: '#eee',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px),' +
              'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Header bar ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            borderBottom: '1px solid rgba(220,38,38,0.3)',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
            FanXI
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 3, color: '#f59e0b', textTransform: 'uppercase' }}>
            FIFA World Cup 2026
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            fanxi.vercel.app
          </span>
        </div>

        {/* ── Round labels ── */}
        {ROUND_LABELS.map((label, i) => (
          <div
            key={`label-${i}`}
            style={{
              position: 'absolute',
              left: COL_X[i],
              top: 52,
              width: PILL_W,
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 3,
                color: '#dc2626',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </span>
            <div
              style={{
                marginTop: 4,
                height: 1,
                background: 'rgba(220,38,38,0.3)',
                width: '80%',
                marginLeft: '10%',
              }}
            />
          </div>
        ))}

        {/* SVG connector lines */}
        <ConnectorLines lines={lines} />

        {/* ── LEFT SIDE ── */}
        {leftR32.map((m, i) => (
          <MatchBlock key={`lr32-${i}`} matchup={m} x={COL_X[0]} y={leftR32Y[i]} />
        ))}
        {leftR16.map((m, i) => (
          <MatchBlock key={`lr16-${i}`} matchup={m} x={COL_X[1]} y={leftR16Y[i]} />
        ))}
        {leftQF.map((m, i) => (
          <MatchBlock key={`lqf-${i}`} matchup={m} x={COL_X[2]} y={leftQFY[i]} />
        ))}
        {leftSF.map((m, i) => (
          <MatchBlock key={`lsf-${i}`} matchup={m} x={COL_X[3]} y={leftSFY[i]} />
        ))}

        {/* ── FINAL matchup (center) ── */}
        <div style={{ position: 'absolute', left: COL_X[FINAL_COL], top: finalY }}>
          <TeamPill
            team={finalTeamA}
            isWinner={!!champion && champion === finalTeamA}
            isLoser={!!champion && champion !== finalTeamA}
            style={{ position: 'relative' }}
          />
          <div style={{ height: MATCH_GAP }} />
          <TeamPill
            team={finalTeamB}
            isWinner={!!champion && champion === finalTeamB}
            isLoser={!!champion && champion !== finalTeamB}
            style={{ position: 'relative' }}
          />
        </div>

        {/* Finalist VS label */}
        {finalTeamA && finalTeamB && (
          <div
            style={{
              position: 'absolute',
              left: COL_X[FINAL_COL],
              top: finalY - 22,
              width: PILL_W,
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
            }}
          >
            The Final
          </div>
        )}

        {/* ── RIGHT SIDE ── */}
        {rightSF.map((m, i) => (
          <MatchBlock key={`rsf-${i}`} matchup={m} x={COL_X[5]} y={rightSFY[i]} />
        ))}
        {rightQF.map((m, i) => (
          <MatchBlock key={`rqf-${i}`} matchup={m} x={COL_X[6]} y={rightQFY[i]} />
        ))}
        {rightR16.map((m, i) => (
          <MatchBlock key={`rr16-${i}`} matchup={m} x={COL_X[7]} y={rightR16Y[i]} />
        ))}
        {rightR32.map((m, i) => (
          <MatchBlock key={`rr32-${i}`} matchup={m} x={COL_X[8]} y={rightR32Y[i]} />
        ))}

        {/* ── Champion box ── */}
        {champion && champInfo && (
          <div
            style={{
              position: 'absolute',
              left: champX,
              top: champY,
              width: champW,
              height: champH,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(220,38,38,0.2))',
              border: '2px solid #f59e0b',
              borderRadius: 8,
              boxShadow: '0 0 30px rgba(245,158,11,0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 3, color: '#f59e0b', textTransform: 'uppercase' }}>
              World Cup 2026 Champion
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 36, lineHeight: 1 }}>{champInfo.flag}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                {displayName(champion)}
              </span>
            </div>
          </div>
        )}

        {/* ── Bottom branding ── */}
        <div
          style={{
            position: 'absolute',
            right: 28,
            bottom: 14,
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: 0.5,
          }}
        >
          fanxi.vercel.app &middot; #WC2026 #WorldCup2026
        </div>
      </div>
    );
  },
);

export default BracketShareCard;
