'use client';
import React from 'react';

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
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${
            value === opt
              ? 'bg-green-600 border-green-600 text-black shadow-md shadow-green-900/30'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
          }`}
        >
          {labels ? labels[opt] : opt}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ label, pts }: { label: string; pts?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">
        {label}
      </p>
      {pts && (
        <span className="text-[9px] font-bold text-zinc-500 uppercase">{pts}</span>
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
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-[10px] text-zinc-300 uppercase font-bold focus:border-green-500 focus:outline-none transition-colors"
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
  const set = (patch: Partial<OutcomesState>) => onChange({ ...outcomes, ...patch });
  const setPlayer = (patch: Partial<PlayerPredictionsState>) =>
    onPlayerChange({ ...playerPredictions, ...patch });

  return (
    <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">

      {/* 1. Match Result (1X2) */}
      <div className="p-4 bg-zinc-800/40 rounded-xl">
        <SectionHeader label="Match Result (1X2)" pts="3 pts" />
        <PillGroup<ResultOption>
          options={['home', 'draw', 'away']}
          value={outcomes.matchResult}
          labels={RESULT_LABELS}
          onSelect={(v) => set({ matchResult: outcomes.matchResult === v ? null : v })}
        />
      </div>

      {/* 2. Correct Score */}
      <div className="p-4 bg-zinc-800/40 rounded-xl">
        <SectionHeader label="Correct Score" pts="10 pts" />
        <div className="flex items-center justify-center gap-6">
          {(['home', 'away'] as const).map((side, i) => (
            <React.Fragment key={side}>
              {i === 1 && (
                <span className="text-white font-black text-xl leading-none mb-1">:</span>
              )}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-zinc-500 uppercase">{side}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      set({
                        correctScore: {
                          ...outcomes.correctScore,
                          [side]: Math.max(0, outcomes.correctScore[side] - 1),
                        },
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm font-bold transition-all"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-white font-black text-lg">
                    {outcomes.correctScore[side]}
                  </span>
                  <button
                    onClick={() =>
                      set({
                        correctScore: {
                          ...outcomes.correctScore,
                          [side]: Math.min(20, outcomes.correctScore[side] + 1),
                        },
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-500 text-sm font-bold transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Both Teams to Score */}
      <div className="p-4 bg-zinc-800/40 rounded-xl">
        <SectionHeader label="Both Teams to Score (BTTS)" pts="5 pts" />
        <div className="flex gap-2">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => set({ btts: outcomes.btts === val ? null : val })}
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${
                outcomes.btts === val
                  ? 'bg-green-600 border-green-600 text-black shadow-md shadow-green-900/30'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Over / Under Goals */}
      <div className="p-4 bg-zinc-800/40 rounded-xl">
        <SectionHeader label="Over / Under Goals" pts="4 pts" />
        <div className="flex gap-1 mb-3">
          {OVER_UNDER_LINES.map((line) => (
            <button
              key={line}
              onClick={() =>
                set({
                  overUnder: {
                    line,
                    pick: outcomes.overUnder?.pick ?? 'over',
                  },
                })
              }
              className={`flex-1 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                outcomes.overUnder?.line === line
                  ? 'bg-green-600 border-green-600 text-black'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}
            >
              {line}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['over', 'under'] as const).map((pick) => (
            <button
              key={pick}
              onClick={() =>
                set({
                  overUnder: {
                    line: outcomes.overUnder?.line ?? 2.5,
                    pick,
                  },
                })
              }
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${
                outcomes.overUnder?.pick === pick
                  ? 'bg-green-600 border-green-600 text-black shadow-md shadow-green-900/30'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}
            >
              {pick}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Half-Time / Full-Time */}
      <div className="p-4 bg-zinc-800/40 rounded-xl">
        <SectionHeader label="Half-Time / Full-Time" pts="6 pts" />
        <div className="space-y-3">
          {(['ht', 'ft'] as const).map((half) => (
            <div key={half}>
              <p className="text-[9px] text-zinc-500 uppercase mb-1.5">
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
      <div className="border-t border-zinc-700/50 pt-1">
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-3">Sniper Stats</p>

        {/* 6. First Goalscorer */}
        <div className="p-4 bg-zinc-800/40 rounded-xl mb-4">
          <SectionHeader label="First Goalscorer" pts="10 pts" />
          <PlayerPicker
            value={playerPredictions.firstGoalscorer}
            players={allPlayers}
            onChange={(v) => setPlayer({ firstGoalscorer: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 7. Anytime Goalscorer */}
        <div className="p-4 bg-zinc-800/40 rounded-xl mb-4">
          <SectionHeader label="Anytime Goalscorer" pts="5 pts" />
          <PlayerPicker
            value={playerPredictions.anytimeGoalscorer}
            players={allPlayers}
            onChange={(v) => setPlayer({ anytimeGoalscorer: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 8. Player to Assist */}
        <div className="p-4 bg-zinc-800/40 rounded-xl mb-4">
          <SectionHeader label="Player to Assist" pts="5 pts" />
          <PlayerPicker
            value={playerPredictions.playerAssist}
            players={allPlayers}
            onChange={(v) => setPlayer({ playerAssist: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 9. Player to be Carded */}
        <div className="p-4 bg-zinc-800/40 rounded-xl mb-4">
          <SectionHeader label="Player to be Carded" pts="4 pts" />
          <PlayerPicker
            value={playerPredictions.playerCarded}
            players={allPlayers}
            onChange={(v) => setPlayer({ playerCarded: v })}
            placeholder="— Pick a player —"
          />
        </div>

        {/* 10. Shots on Target */}
        <div className="p-4 bg-zinc-800/40 rounded-xl mb-4">
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
            <div className="flex gap-1 mt-2">
              {SHOT_THRESHOLDS.map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setPlayer({
                      shotsOnTarget: {
                        player: playerPredictions.shotsOnTarget!.player,
                        threshold: n,
                      },
                    })
                  }
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                    playerPredictions.shotsOnTarget?.threshold === n
                      ? 'bg-green-600 border-green-600 text-black'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                  }`}
                >
                  {n === 4 ? '4+' : `${n}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 11. Man of the Match */}
        <div className="p-4 bg-zinc-800/40 rounded-xl">
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
