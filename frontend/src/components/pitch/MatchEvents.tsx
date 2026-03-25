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

function SectionCard({ children, pts, label, icon }: {
  children: React.ReactNode;
  label: string;
  icon: string;
  pts?: string;
}) {
  const { primary } = useTheme();
  return (
    <div
      className="border theme-transition"
      style={{ background: 'var(--dark)', borderColor: `color-mix(in srgb, ${primary} 14%, transparent)` }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `color-mix(in srgb, ${primary} 10%, transparent)`, background: `color-mix(in srgb, ${primary} 4%, transparent)` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <span className="font-sans font-semibold text-[13px]" style={{ color: 'var(--text)' }}>{label}</span>
        </div>
        {pts && (
          <span
            className="font-mono text-xs font-bold px-2.5 py-1 theme-transition"
            style={{ color: primary, background: `color-mix(in srgb, ${primary} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}
          >
            +{pts}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function PillGroup<T extends string>({
  options, value, onSelect, labels,
}: {
  options: T[];
  value: T | null;
  onSelect: (v: T) => void;
  labels?: Record<T, string>;
}) {
  const { primary } = useTheme();
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="flex-1 py-3 font-sans font-semibold text-[13px] border transition-all theme-transition"
          style={value === opt
            ? { background: primary, borderColor: primary, color: 'var(--dark)' }
            : { background: 'var(--dark3)', borderColor: `rgba(255,255,255,0.08)`, color: 'rgba(255,255,255,0.45)' }}
        >
          {labels ? labels[opt] : opt}
        </button>
      ))}
    </div>
  );
}

function PlayerPicker({
  value, players, onChange, placeholder,
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
      className="w-full px-3 py-3 border font-sans font-semibold text-[13px] focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
      style={{
        background: 'var(--dark3)',
        borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
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
  outcomes, onChange, playerPredictions, onPlayerChange, allPlayers,
}: MatchEventsProps) {
  const { primary } = useTheme();
  const set = (patch: Partial<OutcomesState>) => onChange({ ...outcomes, ...patch });
  const setPlayer = (patch: Partial<PlayerPredictionsState>) =>
    onPlayerChange({ ...playerPredictions, ...patch });

  return (
    <div className="flex flex-col gap-3">

      {/* 1. Match Result */}
      <SectionCard label="Match Result" icon="⚽" pts="3 pts">
        <PillGroup<ResultOption>
          options={['home', 'draw', 'away']}
          value={outcomes.matchResult}
          labels={RESULT_LABELS}
          onSelect={(v) => set({ matchResult: outcomes.matchResult === v ? null : v })}
        />
      </SectionCard>

      {/* 2. Correct Score */}
      <SectionCard label="Correct Score" icon="🎯" pts="10 pts">
        <div className="flex items-center justify-center gap-8">
          {(['home', 'away'] as const).map((side, i) => (
            <React.Fragment key={side}>
              {i === 1 && (
                <span className="font-display text-3xl leading-none" style={{ color: 'rgba(255,255,255,0.25)' }}>:</span>
              )}
              <div className="flex flex-col items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{side}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => set({ correctScore: { ...outcomes.correctScore, [side]: Math.max(0, outcomes.correctScore[side] - 1) } })}
                    className="w-9 h-9 border font-bold text-lg transition-all theme-transition"
                    style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`, color: 'var(--muted)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = primary; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
                  >−</button>
                  <span className="font-display text-4xl w-8 text-center leading-none" style={{ color: 'var(--text)' }}>
                    {outcomes.correctScore[side]}
                  </span>
                  <button
                    onClick={() => set({ correctScore: { ...outcomes.correctScore, [side]: Math.min(20, outcomes.correctScore[side] + 1) } })}
                    className="w-9 h-9 border font-bold text-lg transition-all theme-transition"
                    style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`, color: 'var(--muted)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = primary; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
                  >+</button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </SectionCard>

      {/* 3. BTTS */}
      <SectionCard label="Both Teams to Score" icon="🔁" pts="5 pts">
        <div className="flex gap-2">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => set({ btts: outcomes.btts === val ? null : val })}
              className="flex-1 py-3 font-sans font-semibold text-[13px] border transition-all theme-transition"
              style={outcomes.btts === val
                ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                : { background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 4. Over / Under */}
      <SectionCard label="Over / Under Goals" icon="📊" pts="4 pts">
        <div className="flex gap-2 mb-3">
          {OVER_UNDER_LINES.map((line) => (
            <button
              key={line}
              onClick={() => set({ overUnder: { line, pick: outcomes.overUnder?.pick ?? 'over' } })}
              className="flex-1 py-2.5 font-sans font-semibold text-[13px] border transition-all theme-transition"
              style={outcomes.overUnder?.line === line
                ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                : { background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
            >
              {line}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['over', 'under'] as const).map((pick) => (
            <button
              key={pick}
              onClick={() => set({ overUnder: { line: outcomes.overUnder?.line ?? 2.5, pick } })}
              className="flex-1 py-2.5 font-sans font-semibold text-[13px] border transition-all theme-transition"
              style={outcomes.overUnder?.pick === pick
                ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                : { background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
            >
              {pick.charAt(0).toUpperCase() + pick.slice(1)}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 5. HT / FT */}
      <SectionCard label="Half-Time / Full-Time" icon="⏱️" pts="6 pts">
        <div className="flex flex-col gap-3">
          {(['ht', 'ft'] as const).map((half) => (
            <div key={half}>
              <p className="font-mono text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                {half === 'ht' ? 'Half Time' : 'Full Time'}
              </p>
              <PillGroup<ResultOption>
                options={['home', 'draw', 'away']}
                value={outcomes.htFt?.[half] ?? null}
                labels={RESULT_LABELS}
                onSelect={(v) => set({
                  htFt: {
                    ht: outcomes.htFt?.ht ?? 'draw',
                    ft: outcomes.htFt?.ft ?? 'draw',
                    [half]: outcomes.htFt?.[half] === v ? 'draw' : v,
                  },
                })}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Sniper Stats ──────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-1"
        style={{ color: 'rgba(255,255,255,0.2)' }}
      >
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <span className="font-mono text-xs uppercase tracking-[3px]">Sniper Stats</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>

      <SectionCard label="First Goalscorer" icon="🥇" pts="10 pts">
        <PlayerPicker value={playerPredictions.firstGoalscorer} players={allPlayers}
          onChange={(v) => setPlayer({ firstGoalscorer: v })} placeholder="— Pick a player —" />
      </SectionCard>

      <SectionCard label="Anytime Goalscorer" icon="⚽" pts="5 pts">
        <PlayerPicker value={playerPredictions.anytimeGoalscorer} players={allPlayers}
          onChange={(v) => setPlayer({ anytimeGoalscorer: v })} placeholder="— Pick a player —" />
      </SectionCard>

      <SectionCard label="Player to Assist" icon="🎁" pts="5 pts">
        <PlayerPicker value={playerPredictions.playerAssist} players={allPlayers}
          onChange={(v) => setPlayer({ playerAssist: v })} placeholder="— Pick a player —" />
      </SectionCard>

      <SectionCard label="Player to be Carded" icon="🟨" pts="4 pts">
        <PlayerPicker value={playerPredictions.playerCarded} players={allPlayers}
          onChange={(v) => setPlayer({ playerCarded: v })} placeholder="— Pick a player —" />
      </SectionCard>

      <SectionCard label="Shots on Target" icon="🎯" pts="4 pts">
        <PlayerPicker
          value={playerPredictions.shotsOnTarget?.player ?? null}
          players={allPlayers}
          onChange={(v) => setPlayer({
            shotsOnTarget: v
              ? { player: v, threshold: playerPredictions.shotsOnTarget?.threshold ?? 2 }
              : null,
          })}
          placeholder="— Pick a player —"
        />
        {playerPredictions.shotsOnTarget && (
          <div className="flex gap-2 mt-3">
            {SHOT_THRESHOLDS.map((n) => (
              <button
                key={n}
                onClick={() => setPlayer({ shotsOnTarget: { player: playerPredictions.shotsOnTarget!.player, threshold: n } })}
                className="flex-1 py-2.5 font-sans font-semibold text-[13px] border transition-all theme-transition"
                style={playerPredictions.shotsOnTarget?.threshold === n
                  ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                  : { background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
              >
                {n === 4 ? '4+' : `${n}`}
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard label="Man of the Match" icon="🏆" pts="8 pts">
        <PlayerPicker value={playerPredictions.manOfTheMatch} players={allPlayers}
          onChange={(v) => setPlayer({ manOfTheMatch: v })} placeholder="— Pick a player —" />
      </SectionCard>

    </div>
  );
}
