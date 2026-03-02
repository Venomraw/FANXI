'use client';
import React from 'react';
import { useTheme } from '@/src/context/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OutcomesState {
  matchResult: 'home' | 'draw' | 'away' | null;
  correctScore: { home: number; away: number };
  btts: boolean | null;
  overUnder: { line: number; pick: 'over' | 'under' } | null;
  htFt: { ht: 'home' | 'draw' | 'away'; ft: 'home' | 'draw' | 'away' } | null;
}

export interface PlayerPredictionsState {
  firstGoalscorer: string | null;
  anytimeGoalscorer: string | null;
  playerAssist: string | null;
  playerCarded: string | null;
  shotsOnTarget: { player: string; threshold: number } | null;
  manOfTheMatch: string | null;
}

interface MatchEventsProps {
  outcomes: OutcomesState;
  onChange: (updated: OutcomesState) => void;
  playerPredictions: PlayerPredictionsState;
  onPlayerChange: (updated: PlayerPredictionsState) => void;
  allPlayers: { name: string; number: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ResultOption = 'home' | 'draw' | 'away';
const RESULT_LABELS: Record<ResultOption, string> = { home: 'Home', draw: 'Draw', away: 'Away' };
const OVER_UNDER_LINES = [1.5, 2.5, 3.5, 4.5];
const SHOT_THRESHOLDS = [1, 2, 3, 4];

function PillGroup<T extends string>({
  options,
  value,
  onSelect,
  labels,
}: {
  options: T[];
  value: T | null;
  onSelect: (v: T) => void;
  labels?: Record<T, string>;
}) {
  const { primary } = useTheme();
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="flex-1 py-2 font-mono text-[10px] font-bold uppercase border transition-all theme-transition"
          style={value === opt
            ? { background: primary, borderColor: primary, color: '#000' }
            : { background: 'var(--dark)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
        >
          {labels ? labels[opt] : opt}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ label, pts }: { label: string; pts?: string }) {
  const { primary } = useTheme();
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest theme-transition" style={{ color: primary }}>
        {label}
      </p>
      {pts && (
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 border theme-transition"
          style={{ color: primary, borderColor: `${primary}30`, background: `${primary}10` }}>
          {pts}
        </span>
      )}
    </div>
  );
}

function PlayerPicker({
  value,
  players,
  onChange,
  placeholder,
}: {
  value: string | null;
  players: { name: string; number: number }[];
  onChange: (v: string | null) => void;
  placeholder: string;
}) {
  const { primary } = useTheme();
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full p-2.5 border font-mono text-[11px] text-white uppercase font-bold focus:outline-none transition-colors"
      style={{
        background: 'var(--dark)',
        borderColor: 'rgba(255,255,255,0.1)',
        color: value ? 'var(--text)' : 'rgba(255,255,255,0.3)',
        accentColor: primary,
      }}
    >
      <option value="">{placeholder}</option>
      {players.map((p) => (
        <option key={p.name} value={p.name}>
          {p.name} #{p.number}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MatchEvents({
  outcomes,
  onChange,
  playerPredictions,
  onPlayerChange,
  allPlayers,
}: MatchEventsProps) {
  const { primary } = useTheme();
  const set = (patch: Partial<OutcomesState>) => onChange({ ...outcomes, ...patch });
  const setPlayer = (patch: Partial<PlayerPredictionsState>) =>
    onPlayerChange({ ...playerPredictions, ...patch });

  const cardStyle = {
    background: 'var(--dark)',
    borderColor: 'rgba(255,255,255,0.07)',
  };

  return (
    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">

      {/* 1. Match Result (1X2) */}
      <div className="p-4 border" style={cardStyle}>
        <SectionHeader label="Match Result (1X2)" pts="3 pts" />
        <PillGroup<ResultOption>
          options={['home', 'draw', 'away']}
          value={outcomes.matchResult}
          labels={RESULT_LABELS}
          onSelect={(v) => set({ matchResult: outcomes.matchResult === v ? null : v })}
        />
      </div>

      {/* 2. Correct Score */}
      <div className="p-4 border" style={cardStyle}>
        <SectionHeader label="Correct Score" pts="10 pts" />
        <div className="flex items-center justify-center gap-6">
          {(['home', 'away'] as const).map((side, i) => (
            <React.Fragment key={side}>
              {i === 1 && (
                <span className="font-display text-2xl leading-none" style={{ color: 'rgba(255,255,255,0.3)' }}>:</span>
              )}
              <div className="flex flex-col items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{side}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => set({ correctScore: { ...outcomes.correctScore, [side]: Math.max(0, outcomes.correctScore[side] - 1) } })}
                    className="w-8 h-8 border font-bold text-sm transition-all"
                    style={{ background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
                  >−</button>
                  <span className="font-display text-2xl w-6 text-center" style={{ color: 'var(--text)' }}>
                    {outcomes.correctScore[side]}
                  </span>
                  <button
                    onClick={() => set({ correctScore: { ...outcomes.correctScore, [side]: Math.min(20, outcomes.correctScore[side] + 1) } })}
                    className="w-8 h-8 border font-bold text-sm transition-all"
                    style={{ background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
                  >+</button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Both Teams to Score */}
      <div className="p-4 border" style={cardStyle}>
        <SectionHeader label="Both Teams to Score (BTTS)" pts="5 pts" />
        <div className="flex gap-1.5">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => set({ btts: outcomes.btts === val ? null : val })}
              className="flex-1 py-2 font-mono text-[10px] font-bold uppercase border transition-all theme-transition"
              style={outcomes.btts === val
                ? { background: primary, borderColor: primary, color: '#000' }
                : { background: 'var(--dark)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Over / Under Goals */}
      <div className="p-4 border" style={cardStyle}>
        <SectionHeader label="Over / Under Goals" pts="4 pts" />
        <div className="flex gap-1.5 mb-3">
          {OVER_UNDER_LINES.map((line) => (
            <button
              key={line}
              onClick={() => set({ overUnder: { line, pick: outcomes.overUnder?.pick ?? 'over' } })}
              className="flex-1 py-2 font-mono text-[10px] font-bold border transition-all theme-transition"
              style={outcomes.overUnder?.line === line
                ? { background: primary, borderColor: primary, color: '#000' }
                : { background: 'var(--dark)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            >
              {line}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['over', 'under'] as const).map((pick) => (
            <button
              key={pick}
              onClick={() => set({ overUnder: { line: outcomes.overUnder?.line ?? 2.5, pick } })}
              className="flex-1 py-2 font-mono text-[10px] font-bold uppercase border transition-all theme-transition"
              style={outcomes.overUnder?.pick === pick
                ? { background: primary, borderColor: primary, color: '#000' }
                : { background: 'var(--dark)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            >
              {pick}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Half-Time / Full-Time */}
      <div className="p-4 border" style={cardStyle}>
        <SectionHeader label="Half-Time / Full-Time" pts="6 pts" />
        <div className="flex flex-col gap-3">
          {(['ht', 'ft'] as const).map((half) => (
            <div key={half}>
              <p className="font-mono text-[10px] uppercase tracking-wider mb-2"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                {half === 'ht' ? 'Half Time' : 'Full Time'}
              </p>
              <PillGroup<ResultOption>
                options={['home', 'draw', 'away']}
                value={outcomes.htFt?.[half] ?? null}
                labels={RESULT_LABELS}
                onSelect={(v) =>
                  set({
                    htFt: {
                      ht: outcomes.htFt?.ht ?? 'draw',
                      ft: outcomes.htFt?.ft ?? 'draw',
                      [half]: outcomes.htFt?.[half] === v ? 'draw' : v,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Sniper Stats divider ─────────────────────────────────────── */}
      <div className="border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <p className="font-mono text-[11px] uppercase tracking-[3px] mb-3"
          style={{ color: 'rgba(255,255,255,0.25)' }}>Sniper Stats</p>

        {/* 6. First Goalscorer */}
        <div className="p-4 border mb-3" style={cardStyle}>
          <SectionHeader label="First Goalscorer" pts="10 pts" />
          <PlayerPicker
            value={playerPredictions.firstGoalscorer}
            players={allPlayers}
            onChange={(v) => setPlayer({ firstGoalscorer: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 7. Anytime Goalscorer */}
        <div className="p-4 border mb-3" style={cardStyle}>
          <SectionHeader label="Anytime Goalscorer" pts="5 pts" />
          <PlayerPicker
            value={playerPredictions.anytimeGoalscorer}
            players={allPlayers}
            onChange={(v) => setPlayer({ anytimeGoalscorer: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 8. Player to Assist */}
        <div className="p-4 border mb-3" style={cardStyle}>
          <SectionHeader label="Player to Assist" pts="5 pts" />
          <PlayerPicker
            value={playerPredictions.playerAssist}
            players={allPlayers}
            onChange={(v) => setPlayer({ playerAssist: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 9. Player to be Carded */}
        <div className="p-4 border mb-3" style={cardStyle}>
          <SectionHeader label="Player to be Carded" pts="4 pts" />
          <PlayerPicker
            value={playerPredictions.playerCarded}
            players={allPlayers}
            onChange={(v) => setPlayer({ playerCarded: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 10. Shots on Target */}
        <div className="p-4 border mb-3" style={cardStyle}>
          <SectionHeader label="Shots on Target" pts="4 pts" />
          <PlayerPicker
            value={playerPredictions.shotsOnTarget?.player ?? null}
            players={allPlayers}
            onChange={(v) =>
              setPlayer({
                shotsOnTarget: v
                  ? { player: v, threshold: playerPredictions.shotsOnTarget?.threshold ?? 2 }
                  : null,
              })
            }
            placeholder="— Pick a player —"
          />
          {playerPredictions.shotsOnTarget && (
            <div className="flex gap-1.5 mt-2">
              {SHOT_THRESHOLDS.map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setPlayer({ shotsOnTarget: { player: playerPredictions.shotsOnTarget!.player, threshold: n } })
                  }
                  className="flex-1 py-1.5 font-mono text-[10px] font-bold border transition-all theme-transition"
                  style={playerPredictions.shotsOnTarget?.threshold === n
                    ? { background: primary, borderColor: primary, color: '#000' }
                    : { background: 'var(--dark)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                >
                  {n === 4 ? '4+' : `${n}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 11. Man of the Match */}
        <div className="p-4 border" style={cardStyle}>
          <SectionHeader label="Man of the Match" pts="8 pts" />
          <PlayerPicker
            value={playerPredictions.manOfTheMatch}
            players={allPlayers}
            onChange={(v) => setPlayer({ manOfTheMatch: v })}
            placeholder="— Pick a player —"
          />
        </div>
      </div>

    </div>
  );
}
