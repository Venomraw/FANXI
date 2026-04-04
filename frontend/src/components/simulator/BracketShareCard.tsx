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
// Constants
// ---------------------------------------------------------------------------

const W = 1400;
const H = 800;
const BG = '#0a0f1e';
const PILL_BG = 'rgba(255,255,255,0.08)';
const PILL_BORDER = 'rgba(255,255,255,0.15)';
const WINNER_BG = 'rgba(220,38,38,0.25)';
const WINNER_BORDER = '#dc2626';
const CHAMP_BORDER = '#f59e0b';
const MUTED = 'rgba(255,255,255,0.35)';
const TEXT = '#e8f0e8';
const LINE_COLOR = 'rgba(255,255,255,0.15)';

const ROUND_LABELS = ['R32', 'R16', 'QF', 'SF', 'FINAL', 'SF', 'QF', 'R16', 'R32'];

// Pill sizing
const PILL_W = 120;
const PILL_H = 22;
const MATCH_GAP = 4; // gap between teamA and teamB pill
const MATCH_H = PILL_H * 2 + MATCH_GAP; // 48px per matchup

// Column x positions (9 columns: R32 R16 QF SF FINAL SF QF R16 R32)
const COL_X = [20, 170, 310, 440, 580, 720, 850, 990, 1140];
const FINAL_COL = 4; // center column index

// ---------------------------------------------------------------------------
// Helper: compute Y positions for matches in each round
// ---------------------------------------------------------------------------

function distributeY(count: number, totalH: number, topOffset: number): number[] {
  if (count === 0) return [];
  const available = totalH - topOffset;
  const spacing = available / count;
  return Array.from({ length: count }, (_, i) => topOffset + spacing * 0.5 + i * spacing);
}

// ---------------------------------------------------------------------------
// Sub-components (inline, rendered to DOM for html2canvas)
// ---------------------------------------------------------------------------

function TeamPill({
  team,
  isWinner,
  isChampion,
  style,
}: {
  team: string | null;
  isWinner: boolean;
  isChampion?: boolean;
  style: React.CSSProperties;
}) {
  if (!team) {
    return (
      <div
        style={{
          ...style,
          width: PILL_W,
          height: PILL_H,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid rgba(255,255,255,0.06)`,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          fontSize: 10,
          color: 'rgba(255,255,255,0.15)',
        }}
      >
        TBD
      </div>
    );
  }

  const info = getTeamInfo(team);
  const bg = isChampion ? 'rgba(245,158,11,0.2)' : isWinner ? WINNER_BG : PILL_BG;
  const border = isChampion ? CHAMP_BORDER : isWinner ? WINNER_BORDER : PILL_BORDER;

  return (
    <div
      style={{
        ...style,
        width: PILL_W,
        height: PILL_H,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 6px',
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: TEXT,
        boxShadow: isChampion
          ? `0 0 12px rgba(245,158,11,0.3)`
          : isWinner
          ? `0 0 8px rgba(220,38,38,0.2)`
          : 'none',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ flexShrink: 0 }}>{info.flag}</span>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: isWinner || isChampion ? 600 : 400,
        }}
      >
        {info.shortName}
      </span>
    </div>
  );
}

function MatchBlock({
  matchup,
  x,
  y,
}: {
  matchup: Matchup;
  x: number;
  y: number; // center Y
}) {
  const topY = y - MATCH_H / 2;
  return (
    <>
      <TeamPill
        team={matchup.teamA}
        isWinner={!!matchup.winner && matchup.winner === matchup.teamA}
        style={{ position: 'absolute', left: x, top: topY }}
      />
      <TeamPill
        team={matchup.teamB}
        isWinner={!!matchup.winner && matchup.winner === matchup.teamB}
        style={{ position: 'absolute', left: x, top: topY + PILL_H + MATCH_GAP }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// SVG connector lines
// ---------------------------------------------------------------------------

function ConnectorLines({
  positions,
}: {
  positions: {
    from: { x: number; y: number }; // center-right of source matchup
    to: { x: number; y: number };   // center-left of target matchup
  }[];
}) {
  return (
    <svg
      width={W}
      height={H}
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
    >
      {positions.map((p, i) => {
        const midX = (p.from.x + p.to.x) / 2;
        return (
          <path
            key={i}
            d={`M${p.from.x},${p.from.y} H${midX} V${p.to.y} H${p.to.x}`}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth={1}
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
    // Split rounds into left (0-7) and right (8-15) halves
    const leftR32 = r32.slice(0, 8);
    const rightR32 = r32.slice(8, 16);
    const leftR16 = r16.slice(0, 4);
    const rightR16 = r16.slice(4, 8);
    const leftQF = qf.slice(0, 2);
    const rightQF = qf.slice(2, 4);
    const leftSF = sf.slice(0, 1);
    const rightSF = sf.slice(1, 2);

    const TOP = 60; // below round labels
    const AREA_H = H - 20; // bottom padding

    // Y positions for each side's rounds
    const leftR32Y = distributeY(8, AREA_H, TOP);
    const rightR32Y = distributeY(8, AREA_H, TOP);
    const leftR16Y = distributeY(4, AREA_H, TOP);
    const rightR16Y = distributeY(4, AREA_H, TOP);
    const leftQFY = distributeY(2, AREA_H, TOP);
    const rightQFY = distributeY(2, AREA_H, TOP);
    const leftSFY = distributeY(1, AREA_H, TOP);
    const rightSFY = distributeY(1, AREA_H, TOP);
    const finalY = (AREA_H + TOP) / 2 - 40;

    // Build connector lines
    const connectors: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];

    // Left side: R32 → R16
    for (let i = 0; i < 4; i++) {
      connectors.push({
        from: { x: COL_X[0] + PILL_W + 4, y: leftR32Y[i * 2] },
        to: { x: COL_X[1] - 4, y: leftR16Y[i] },
      });
      connectors.push({
        from: { x: COL_X[0] + PILL_W + 4, y: leftR32Y[i * 2 + 1] },
        to: { x: COL_X[1] - 4, y: leftR16Y[i] },
      });
    }
    // Left: R16 → QF
    for (let i = 0; i < 2; i++) {
      connectors.push({
        from: { x: COL_X[1] + PILL_W + 4, y: leftR16Y[i * 2] },
        to: { x: COL_X[2] - 4, y: leftQFY[i] },
      });
      connectors.push({
        from: { x: COL_X[1] + PILL_W + 4, y: leftR16Y[i * 2 + 1] },
        to: { x: COL_X[2] - 4, y: leftQFY[i] },
      });
    }
    // Left: QF → SF
    connectors.push({
      from: { x: COL_X[2] + PILL_W + 4, y: leftQFY[0] },
      to: { x: COL_X[3] - 4, y: leftSFY[0] },
    });
    connectors.push({
      from: { x: COL_X[2] + PILL_W + 4, y: leftQFY[1] },
      to: { x: COL_X[3] - 4, y: leftSFY[0] },
    });
    // Left: SF → Final
    connectors.push({
      from: { x: COL_X[3] + PILL_W + 4, y: leftSFY[0] },
      to: { x: COL_X[4] - 4, y: finalY + PILL_H / 2 },
    });

    // Right side: R32 → R16 (mirrored — from left edge of pill)
    for (let i = 0; i < 4; i++) {
      connectors.push({
        from: { x: COL_X[8] - 4, y: rightR32Y[i * 2] },
        to: { x: COL_X[7] + PILL_W + 4, y: rightR16Y[i] },
      });
      connectors.push({
        from: { x: COL_X[8] - 4, y: rightR32Y[i * 2 + 1] },
        to: { x: COL_X[7] + PILL_W + 4, y: rightR16Y[i] },
      });
    }
    // Right: R16 → QF
    for (let i = 0; i < 2; i++) {
      connectors.push({
        from: { x: COL_X[7] - 4, y: rightR16Y[i * 2] },
        to: { x: COL_X[6] + PILL_W + 4, y: rightQFY[i] },
      });
      connectors.push({
        from: { x: COL_X[7] - 4, y: rightR16Y[i * 2 + 1] },
        to: { x: COL_X[6] + PILL_W + 4, y: rightQFY[i] },
      });
    }
    // Right: QF → SF
    connectors.push({
      from: { x: COL_X[6] - 4, y: rightQFY[0] },
      to: { x: COL_X[5] + PILL_W + 4, y: rightSFY[0] },
    });
    connectors.push({
      from: { x: COL_X[6] - 4, y: rightQFY[1] },
      to: { x: COL_X[5] + PILL_W + 4, y: rightSFY[0] },
    });
    // Right: SF → Final
    connectors.push({
      from: { x: COL_X[5] - 4, y: rightSFY[0] },
      to: { x: COL_X[4] + PILL_W + 4, y: finalY + PILL_H + MATCH_GAP + PILL_H / 2 },
    });

    return (
      <div
        ref={ref}
        style={{
          position: inline ? 'relative' : 'absolute',
          left: inline ? undefined : -9999,
          top: inline ? undefined : 0,
          width: W,
          height: H,
          background: BG,
          color: TEXT,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Round labels */}
        {ROUND_LABELS.map((label, i) => (
          <div
            key={`label-${i}`}
            style={{
              position: 'absolute',
              left: COL_X[i],
              top: 16,
              width: PILL_W,
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 2,
              color: MUTED,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        ))}

        {/* Title */}
        <div
          style={{
            position: 'absolute',
            left: COL_X[FINAL_COL],
            top: 36,
            width: PILL_W,
            textAlign: 'center',
            fontSize: 8,
            color: MUTED,
            letterSpacing: 1,
          }}
        >
          FIFA WORLD CUP 2026
        </div>

        {/* SVG connector lines */}
        <ConnectorLines positions={connectors} />

        {/* LEFT SIDE */}
        {/* R32 left (col 0) */}
        {leftR32.map((m, i) => (
          <MatchBlock key={`lr32-${i}`} matchup={m} x={COL_X[0]} y={leftR32Y[i]} />
        ))}
        {/* R16 left (col 1) */}
        {leftR16.map((m, i) => (
          <MatchBlock key={`lr16-${i}`} matchup={m} x={COL_X[1]} y={leftR16Y[i]} />
        ))}
        {/* QF left (col 2) */}
        {leftQF.map((m, i) => (
          <MatchBlock key={`lqf-${i}`} matchup={m} x={COL_X[2]} y={leftQFY[i]} />
        ))}
        {/* SF left (col 3) */}
        {leftSF.map((m, i) => (
          <MatchBlock key={`lsf-${i}`} matchup={m} x={COL_X[3]} y={leftSFY[i]} />
        ))}

        {/* FINAL (col 4 — center) */}
        <div style={{ position: 'absolute', left: COL_X[FINAL_COL], top: finalY }}>
          <TeamPill
            team={finalTeamA}
            isWinner={!!champion && champion === finalTeamA}
            isChampion={!!champion && champion === finalTeamA}
            style={{ position: 'relative' }}
          />
          <div style={{ height: MATCH_GAP }} />
          <TeamPill
            team={finalTeamB}
            isWinner={!!champion && champion === finalTeamB}
            isChampion={!!champion && champion === finalTeamB}
            style={{ position: 'relative' }}
          />
        </div>

        {/* RIGHT SIDE */}
        {/* SF right (col 5) */}
        {rightSF.map((m, i) => (
          <MatchBlock key={`rsf-${i}`} matchup={m} x={COL_X[5]} y={rightSFY[i]} />
        ))}
        {/* QF right (col 6) */}
        {rightQF.map((m, i) => (
          <MatchBlock key={`rqf-${i}`} matchup={m} x={COL_X[6]} y={rightQFY[i]} />
        ))}
        {/* R16 right (col 7) */}
        {rightR16.map((m, i) => (
          <MatchBlock key={`rr16-${i}`} matchup={m} x={COL_X[7]} y={rightR16Y[i]} />
        ))}
        {/* R32 right (col 8) */}
        {rightR32.map((m, i) => (
          <MatchBlock key={`rr32-${i}`} matchup={m} x={COL_X[8]} y={rightR32Y[i]} />
        ))}

        {/* Champion banner */}
        {champion && (
          <div
            style={{
              position: 'absolute',
              left: COL_X[FINAL_COL] - 20,
              top: finalY + MATCH_H + 16,
              width: PILL_W + 40,
              textAlign: 'center',
              padding: '8px 0',
              background: 'rgba(245,158,11,0.12)',
              border: `1px solid ${CHAMP_BORDER}`,
              borderRadius: 6,
              boxShadow: `0 0 20px rgba(245,158,11,0.2)`,
            }}
          >
            <div style={{ fontSize: 8, color: CHAMP_BORDER, letterSpacing: 1.5, marginBottom: 4 }}>
              WORLD CUP 2026 CHAMPION
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {getTeamInfo(champion).flag} {champion}
            </div>
          </div>
        )}

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            right: 20,
            bottom: 12,
            fontSize: 9,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: 0.5,
          }}
        >
          fanxi.vercel.app &middot; #WC2026
        </div>
      </div>
    );
  },
);

export default BracketShareCard;
