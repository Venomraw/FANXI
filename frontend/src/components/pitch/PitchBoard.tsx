'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import PitchSlot from './PitchSlot';
import DraggablePlayer from './DraggablePlayer';
import MatchEvents, { OutcomesState, PlayerPredictionsState } from './MatchEvents';
import MatchSelector, { WCMatch } from './MatchSelector';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { FORMATIONS, DEFAULT_FORMATION, FormationLayout } from '@/src/data/formations';

interface Player {
  name: string;
  number: number;
  position?: string;
}

const PLACEHOLDER_SQUAD: Player[] = [
  { name: 'GK #1',   number: 1,  position: 'GK'  },
  { name: 'RB #2',   number: 2,  position: 'RB'  },
  { name: 'CB #3',   number: 3,  position: 'CB'  },
  { name: 'CB #4',   number: 4,  position: 'CB'  },
  { name: 'LB #5',   number: 5,  position: 'LB'  },
  { name: 'CDM #6',  number: 6,  position: 'CDM' },
  { name: 'CM #8',   number: 8,  position: 'CM'  },
  { name: 'CAM #10', number: 10, position: 'CAM' },
  { name: 'RW #7',   number: 7,  position: 'RW'  },
  { name: 'ST #9',   number: 9,  position: 'ST'  },
  { name: 'LW #11',  number: 11, position: 'LW'  },
];

type RightTab = 'tactics' | 'predictions' | 'halftime' | 'history';

interface HalfTimeSub {
  out: string | null;
  in:  string | null;
}

interface HalfTimePredictions {
  subs:              [HalfTimeSub, HalfTimeSub, HalfTimeSub];
  formationChanged:  boolean | null;
  newFormation:      string | null;
  tacticalShift:     'hold' | 'same' | 'attack' | null;
  secondHalfResult:  'home' | 'draw' | 'away' | null;
  nextGoalscorer:    string | null;
}

export default function PitchBoard() {
  const { primary, team } = useTheme();
  const { user, token } = useAuth();
  const [isMounted, setIsMounted]         = useState(false);
  const [rightTab, setRightTab]           = useState<RightTab>('tactics');
  const [formation, setFormation]         = useState<FormationLayout>(DEFAULT_FORMATION);
  const [tactics, setTactics]             = useState<{
    mentality: 'defensive' | 'balanced' | 'attacking';
    pressing:  'low' | 'medium' | 'high' | 'gegenpress';
    width:     'narrow' | 'balanced' | 'wide';
  }>({ mentality: 'balanced', pressing: 'medium', width: 'balanced' });
  const [squad, setSquad]                 = useState<Player[]>(PLACEHOLDER_SQUAD);
  const [squadLoading, setSquadLoading]   = useState(false);
  const [lineup, setLineup]               = useState<Record<string, Player>>({});
  const [selectedMatch, setSelectedMatch] = useState<WCMatch | null>(null);
  const [history, setHistory]             = useState<any[]>([]);
  const [lockMsg, setLockMsg]             = useState<{ ok: boolean; text: string } | null>(null);
  const [halfTime, setHalfTime]           = useState<HalfTimePredictions>({
    subs:             [{ out: null, in: null }, { out: null, in: null }, { out: null, in: null }],
    formationChanged: null,
    newFormation:     null,
    tacticalShift:    null,
    secondHalfResult: null,
    nextGoalscorer:   null,
  });

  const [outcomes, setOutcomes] = useState<OutcomesState>({
    matchResult: null,
    correctScore: { home: 0, away: 0 },
    btts: null,
    overUnder: null,
    htFt: null,
  });
  const [playerPredictions, setPlayerPredictions] = useState<PlayerPredictionsState>({
    firstGoalscorer: null,
    anytimeGoalscorer: null,
    playerAssist: null,
    playerCarded: null,
    shotsOnTarget: null,
    manOfTheMatch: null,
  });

  useEffect(() => { setIsMounted(true); }, []);

  const loadSquad = useCallback(async (teamName: string) => {
    setSquadLoading(true);
    try {
      const res  = await fetch(`http://localhost:8000/squad/${encodeURIComponent(teamName)}`);
      const data = await res.json();
      const players: Player[] = (data.players ?? []).map((p: any) => ({
        name: p.name, number: p.number ?? 0, position: p.position,
      }));
      if (players.length > 0) { setSquad(players); setLineup({}); }
    } catch { /* keep current */ }
    finally { setSquadLoading(false); }
  }, []);

  useEffect(() => { if (team?.name) loadSquad(team.name); }, [team?.name, loadSquad]);

  const handleFormationChange = (f: FormationLayout) => {
    const newSlots = f.slots.flat();
    const displaced: Player[] = [];
    const newLineup: Record<string, Player> = {};
    Object.entries(lineup).forEach(([slot, player]) => {
      if (newSlots.includes(slot)) newLineup[slot] = player;
      else displaced.push(player);
    });
    setFormation(f);
    setLineup(newLineup);
    if (displaced.length > 0) setSquad(prev => [...prev, ...displaced]);
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/predictions/history/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setHistory(await res.json());
    } catch { /* swallow */ }
  };

  const handleLockSelection = async () => {
    const matchId = selectedMatch?.id ?? 1001;
    const finalData = {
      lineup, tactics,
      outcomes: {
        match_result: outcomes.matchResult,
        correct_score: outcomes.correctScore,
        btts: outcomes.btts,
        over_under: outcomes.overUnder,
        ht_ft: outcomes.htFt,
      },
      player_predictions: {
        first_goalscorer:    playerPredictions.firstGoalscorer,
        anytime_goalscorer:  playerPredictions.anytimeGoalscorer,
        player_assist:       playerPredictions.playerAssist,
        player_carded:       playerPredictions.playerCarded,
        shots_on_target:     playerPredictions.shotsOnTarget,
        man_of_the_match:    playerPredictions.manOfTheMatch,
      },
      half_time_predictions: halfTime,
      timestamp: new Date().toISOString(),
      status: 'LOCKED',
    };
    try {
      const userId = user?.id ?? 1;
      const res = await fetch(
        `http://localhost:8000/predictions/lock/${matchId}?user_id=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(finalData),
        }
      );
      if (res.ok) {
        setLockMsg({ ok: true, text: `🔒 Locked — ${selectedMatch?.home_team ?? 'Match'} vs ${selectedMatch?.away_team ?? '—'}` });
        fetchHistory();
      } else {
        setLockMsg({ ok: false, text: '❌ Lock failed — try again.' });
      }
    } catch {
      setLockMsg({ ok: false, text: '❌ Connection error.' });
    }
    setTimeout(() => setLockMsg(null), 4000);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId   = over.id   as string;
    const fromBench = squad.find(p => p.name === activeId);
    if (fromBench) {
      const displaced = lineup[overId];
      setLineup(prev => ({ ...prev, [overId]: fromBench }));
      setSquad(prev => {
        let next = prev.filter(p => p.name !== activeId);
        if (displaced) next = [...next, displaced];
        return next;
      });
      return;
    }
    const sourceSlot = Object.keys(lineup).find(k => lineup[k].name === activeId);
    if (sourceSlot && sourceSlot !== overId) {
      const moving = lineup[sourceSlot];
      const target = lineup[overId];
      setLineup(prev => {
        const next = { ...prev };
        if (target) next[sourceSlot] = target;
        else delete next[sourceSlot];
        next[overId] = moving;
        return next;
      });
    }
  };

  const handleResetPitch = () => {
    setSquad(prev => [...prev, ...Object.values(lineup)]);
    setLineup({});
  };

  const placedCount  = Object.keys(lineup).length;
  const allPlayers   = [...squad, ...Object.values(lineup)];

  if (!isMounted) return null;

  return (
    <div className="flex flex-col gap-4">

      {/* ── MATCH SELECTOR ── */}
      <div
        className="p-4 glass-panel theme-transition"
        style={{ borderColor: `color-mix(in srgb, ${primary} 20%, transparent)` }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[11px] uppercase tracking-[3px]" style={{ color: 'var(--muted)' }}>
            Select Match to Predict
          </p>
          {selectedMatch && (
            <p className="font-mono text-xs font-bold theme-transition" style={{ color: primary }}>
              {selectedMatch.home_team} vs {selectedMatch.away_team}
            </p>
          )}
        </div>
        <MatchSelector selectedId={selectedMatch?.id ?? null} onSelect={m => setSelectedMatch(m)} />
      </div>

      {/* ── 3-COLUMN LAYOUT ── */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] xl:grid-cols-[240px_1fr_320px] gap-4 items-stretch">

          {/* ══ LEFT: BENCH / SQUAD ══════════════════════════════════════════════ */}
          <div
            className="glass-panel theme-transition flex flex-col"
            style={{ borderColor: `color-mix(in srgb, ${primary} 18%, transparent)` }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[3px]" style={{ color: primary }}>
                Bench
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[10px] px-2 py-0.5 theme-transition"
                  style={{
                    background: `color-mix(in srgb, ${primary} 12%, transparent)`,
                    color: primary,
                    border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`,
                  }}
                >
                  {placedCount}/11
                </span>
                <button
                  onClick={handleResetPitch}
                  className="font-mono text-[9px] uppercase tracking-wider transition-colors"
                  style={{ color: 'var(--muted)', background: 'none', border: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = primary)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  Reset ↺
                </button>
              </div>
            </div>

            {/* Squad list */}
            <div className="p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {squadLoading && (
                <p className="font-mono text-[11px] uppercase tracking-widest text-center py-6 theme-transition" style={{ color: primary }}>
                  Scouting squad...
                </p>
              )}
              {!squadLoading && squad.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="text-2xl">✅</span>
                  <p className="font-mono text-[11px] text-center" style={{ color: 'var(--muted)' }}>
                    All players on pitch
                  </p>
                </div>
              )}
              {squad.map(p => (
                <DraggablePlayer key={p.name} id={p.name} name={p.name} number={p.number} />
              ))}
            </div>
          </div>

          {/* ══ CENTER: PITCH ════════════════════════════════════════════════════ */}
          <div className="flex flex-row gap-3 items-start justify-center">

            {/* Pitch surface */}
            <div
              className="relative w-full max-w-[380px] lg:max-w-[440px] xl:max-w-[520px] aspect-[2/3] flex-shrink-0 p-3 lg:p-4 xl:p-5 border"
              style={{
                background: '#060A06',
                borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
                backgroundImage: [
                  `linear-gradient(color-mix(in srgb, ${primary} 3%, transparent) 1px, transparent 1px)`,
                  `linear-gradient(90deg, color-mix(in srgb, ${primary} 2.5%, transparent) 1px, transparent 1px)`,
                  `radial-gradient(ellipse 110% 70% at 50% 0%, #0d2010 0%, #060A06 70%)`,
                ].join(', '),
                backgroundSize: '36px 36px, 36px 36px, 100% 100%',
              }}
            >
              {/* Pitch markings */}
              <div className="absolute top-1/2 left-8 right-8 h-px pointer-events-none"
                style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)` }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border pointer-events-none"
                style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }} />
              <div className="absolute top-0 left-1/4 right-1/4 h-16 border-b border-l border-r pointer-events-none"
                style={{ borderColor: `color-mix(in srgb, ${primary} 8%, transparent)` }} />
              <div className="absolute bottom-0 left-1/4 right-1/4 h-16 border-t border-l border-r pointer-events-none"
                style={{ borderColor: `color-mix(in srgb, ${primary} 8%, transparent)` }} />

              {/* Slots */}
              <div className="relative h-full flex flex-col justify-between z-10">
                {formation.slots.map((row, rowIdx) => (
                  <div key={rowIdx} className={`flex ${row.length === 1 ? 'justify-center' : 'justify-around'}`}>
                    {row.map(slotId => (
                      <PitchSlot key={slotId} id={slotId} player={lineup[slotId]} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Vertical formation strip ── */}
            <div
              className="flex flex-col flex-shrink-0 border theme-transition overflow-hidden self-stretch"
              style={{
                width: 'clamp(110px, 10vw, 140px)',
                borderColor: `color-mix(in srgb, ${primary} 18%, transparent)`,
                background: 'var(--dark3)',
              }}
            >
              {/* Header */}
              <div
                className="px-3 py-2 border-b text-center"
                style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}
              >
                <span className="font-mono text-[9px] uppercase tracking-[2px]" style={{ color: 'var(--muted)' }}>
                  Formation
                </span>
              </div>

              {/* Formation cards */}
              {FORMATIONS.map(f => {
                const isActive = formation.name === f.name;
                return (
                  <button
                    key={f.name}
                    onClick={() => handleFormationChange(f)}
                    className="flex-1 flex flex-col items-center justify-center gap-2.5 border-b transition-all duration-200 theme-transition relative"
                    style={{
                      borderColor: `color-mix(in srgb, ${primary} 10%, transparent)`,
                      background: isActive ? `color-mix(in srgb, ${primary} 12%, transparent)` : 'transparent',
                      borderLeft: `3px solid ${isActive ? primary : 'transparent'}`,
                      boxShadow: isActive ? `inset 0 0 20px color-mix(in srgb, ${primary} 6%, transparent)` : 'none',
                    }}
                  >
                    {/* Formation name */}
                    <span
                      className="font-display font-semibold leading-none theme-transition"
                      style={{ fontSize: '18px', color: isActive ? primary : 'var(--muted)' }}
                    >
                      {f.label}
                    </span>

                    {/* Dot grid preview */}
                    <div className="flex flex-col gap-[4px] items-center">
                      {f.slots.map((row, i) => (
                        <div key={i} className="flex gap-[4px] justify-center">
                          {row.map((_, j) => (
                            <div
                              key={j}
                              className="rounded-full theme-transition"
                              style={{
                                width: '6px',
                                height: '6px',
                                background: isActive ? primary : 'var(--muted)',
                                opacity: isActive ? 1 : 0.45,
                                boxShadow: isActive ? `0 0 4px ${primary}` : 'none',
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══ RIGHT: TACTICS + PREDICTIONS + LOCK ══════════════════════════════ */}
          <div
            className="glass-panel theme-transition flex flex-col"
            style={{ borderColor: `color-mix(in srgb, ${primary} 18%, transparent)` }}
          >
            {/* Tab bar */}
            <div
              className="flex border-b"
              style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}
            >
              {([
                { id: 'tactics',     icon: '⚙️', label: 'Tactics' },
                { id: 'predictions', icon: '🎯', label: 'Predict' },
                { id: 'halftime',    icon: '⏱️', label: 'Half-Time' },
                { id: 'history',     icon: '📋', label: 'History' },
              ] as { id: RightTab; icon: string; label: string }[]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setRightTab(tab.id); if (tab.id === 'history') fetchHistory(); }}
                  className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-all theme-transition"
                  style={rightTab === tab.id
                    ? { background: primary, color: 'var(--dark)' }
                    : { color: 'var(--muted)', background: 'transparent' }
                  }
                >
                  <span className="text-sm leading-none">{tab.icon}</span>
                  <span className="font-mono text-[8px] uppercase tracking-widest font-bold">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex flex-col overflow-y-auto custom-scrollbar flex-1 min-h-0">

              {/* ── TACTICS TAB ── */}
              {rightTab === 'tactics' && (
                <div className="flex flex-col h-full">

                  {/* MENTALITY */}
                  <div
                    className="flex-1 flex flex-col px-4 py-5 border-b"
                    style={{ borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[2px] mb-4" style={{ color: 'var(--muted)' }}>
                      Mentality
                    </p>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      {([
                        { val: 'defensive', icon: '🛡️', label: 'Defensive', desc: 'Park the bus'  },
                        { val: 'balanced',  icon: '⚖️', label: 'Balanced',  desc: 'Counter press' },
                        { val: 'attacking', icon: '⚡', label: 'Attacking', desc: 'All out'        },
                      ] as const).map(opt => {
                        const active = tactics.mentality === opt.val;
                        return (
                          <button
                            key={opt.val}
                            onClick={() => setTactics({ ...tactics, mentality: opt.val })}
                            className="flex flex-col items-center justify-center gap-2 border transition-all theme-transition"
                            style={{
                              background: active ? `color-mix(in srgb, ${primary} 14%, transparent)` : 'var(--dark)',
                              borderColor: active ? primary : `color-mix(in srgb, ${primary} 15%, transparent)`,
                              boxShadow: active ? `inset 0 -3px 0 ${primary}` : 'none',
                            }}
                          >
                            <span className="text-2xl leading-none">{opt.icon}</span>
                            <span className="font-sans font-semibold text-[13px] leading-none theme-transition" style={{ color: active ? primary : 'var(--text)' }}>
                              {opt.label}
                            </span>
                            <span className="font-mono text-[10px] text-center leading-tight" style={{ color: 'var(--muted)' }}>
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PRESSING */}
                  <div
                    className="flex-1 flex flex-col px-4 py-5 border-b"
                    style={{ borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[2px] mb-4" style={{ color: 'var(--muted)' }}>
                      Pressing
                    </p>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      {([
                        { val: 'low',        icon: '🐢', label: 'Low',        desc: 'Sit deep'    },
                        { val: 'medium',     icon: '🔄', label: 'Medium',     desc: 'Mid-block'   },
                        { val: 'high',       icon: '🔥', label: 'High',       desc: 'Full press'  },
                        { val: 'gegenpress', icon: '🌪️', label: 'Gegenpress', desc: 'Klopp style' },
                      ] as const).map(opt => {
                        const active = tactics.pressing === opt.val;
                        return (
                          <button
                            key={opt.val}
                            onClick={() => setTactics({ ...tactics, pressing: opt.val })}
                            className="flex flex-col items-center justify-center gap-2 border transition-all theme-transition"
                            style={{
                              background: active ? `color-mix(in srgb, ${primary} 14%, transparent)` : 'var(--dark)',
                              borderColor: active ? primary : `color-mix(in srgb, ${primary} 15%, transparent)`,
                              boxShadow: active ? `inset 0 -3px 0 ${primary}` : 'none',
                            }}
                          >
                            <span className="text-2xl leading-none">{opt.icon}</span>
                            <span className="font-sans font-semibold text-[13px] leading-none theme-transition" style={{ color: active ? primary : 'var(--text)' }}>
                              {opt.label}
                            </span>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* WIDTH */}
                  <div className="flex-1 flex flex-col px-4 py-5">
                    <p className="font-mono text-[10px] uppercase tracking-[2px] mb-4" style={{ color: 'var(--muted)' }}>
                      Team Width
                    </p>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      {([
                        { val: 'narrow',   icon: '◀▶', label: 'Narrow',   desc: 'Compact'  },
                        { val: 'balanced', icon: '↔️',  label: 'Balanced', desc: 'Flexible' },
                        { val: 'wide',     icon: '⟺',  label: 'Wide',     desc: 'Stretch'  },
                      ] as const).map(opt => {
                        const active = tactics.width === opt.val;
                        return (
                          <button
                            key={opt.val}
                            onClick={() => setTactics({ ...tactics, width: opt.val })}
                            className="flex flex-col items-center justify-center gap-2 border transition-all theme-transition"
                            style={{
                              background: active ? `color-mix(in srgb, ${primary} 14%, transparent)` : 'var(--dark)',
                              borderColor: active ? primary : `color-mix(in srgb, ${primary} 15%, transparent)`,
                              boxShadow: active ? `inset 0 -3px 0 ${primary}` : 'none',
                            }}
                          >
                            <span className="text-2xl leading-none">{opt.icon}</span>
                            <span className="font-sans font-semibold text-[13px] leading-none theme-transition" style={{ color: active ? primary : 'var(--text)' }}>
                              {opt.label}
                            </span>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* ── PREDICTIONS TAB ── */}
              {rightTab === 'predictions' && (
                <div className="p-4 flex flex-col gap-3 flex-1">
                <MatchEvents
                  outcomes={outcomes}
                  onChange={setOutcomes}
                  playerPredictions={playerPredictions}
                  onPlayerChange={setPlayerPredictions}
                  allPlayers={allPlayers}
                />
                </div>
              )}

              {/* ── HALF-TIME TAB ── */}
              {rightTab === 'halftime' && (() => {
                const lineupPlayers = Object.values(lineup);
                const benchPlayers  = squad;
                const setPatch = (patch: Partial<HalfTimePredictions>) =>
                  setHalfTime(prev => ({ ...prev, ...patch }));
                const setSub = (i: number, patch: Partial<HalfTimeSub>) =>
                  setHalfTime(prev => {
                    const subs = [...prev.subs] as [HalfTimeSub, HalfTimeSub, HalfTimeSub];
                    subs[i] = { ...subs[i], ...patch };
                    return { ...prev, subs };
                  });

                return (
                  <div className="flex flex-col h-full">

                    {/* ── Substitutions (flex-[3]) ── */}
                    <div
                      className="flex flex-col px-4 py-5 border-b"
                      style={{ flex: '3 1 0', borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--muted)' }}>Substitutions</p>
                        <span className="font-mono text-[9px] px-2 py-0.5 font-bold theme-transition"
                          style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}>
                          5 pts each
                        </span>
                      </div>

                      {/* Compact sub rows */}
                      <div className="flex flex-col gap-2 flex-1 justify-around">
                        {([0, 1, 2] as const).map(i => (
                          <div key={i} className="flex flex-col gap-1.5 border theme-transition p-3"
                            style={{ background: 'var(--dark)', borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`, borderLeft: `3px solid ${primary}` }}>
                            <span className="font-display font-semibold text-[13px] theme-transition" style={{ color: primary }}>Sub {i + 1}</span>
                            <div className="flex gap-2">
                              {/* OUT */}
                              <div className="flex-1 flex items-center gap-1.5">
                                <span className="font-mono text-[9px] font-bold flex-shrink-0" style={{ color: '#FF2D55' }}>OUT</span>
                                <select value={halfTime.subs[i].out ?? ''} onChange={e => setSub(i, { out: e.target.value || null })}
                                  className="flex-1 px-2 py-1.5 border font-sans font-semibold text-[11px] focus:outline-none"
                                  style={{ background: 'var(--dark3)', borderColor: halfTime.subs[i].out ? '#FF2D5540' : 'rgba(255,255,255,0.08)', color: halfTime.subs[i].out ? 'var(--text)' : 'rgba(255,255,255,0.3)' }}>
                                  <option value="">— XI —</option>
                                  {lineupPlayers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                </select>
                              </div>
                              {/* IN */}
                              <div className="flex-1 flex items-center gap-1.5">
                                <span className="font-mono text-[9px] font-bold flex-shrink-0" style={{ color: 'var(--success)' }}>IN</span>
                                <select value={halfTime.subs[i].in ?? ''} onChange={e => setSub(i, { in: e.target.value || null })}
                                  className="flex-1 px-2 py-1.5 border font-sans font-semibold text-[11px] focus:outline-none"
                                  style={{ background: 'var(--dark3)', borderColor: halfTime.subs[i].in ? 'color-mix(in srgb, var(--success) 40%, transparent)' : 'rgba(255,255,255,0.08)', color: halfTime.subs[i].in ? 'var(--text)' : 'rgba(255,255,255,0.3)' }}>
                                  <option value="">— Bench —</option>
                                  {benchPlayers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Formation Change (flex-[2]) ── */}
                    <div
                      className="flex flex-col px-4 py-5 border-b"
                      style={{ flex: '2 1 0', borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--muted)' }}>Formation Change?</p>
                        <span className="font-mono text-[9px] px-2 py-0.5 font-bold theme-transition"
                          style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}>
                          8 pts
                        </span>
                      </div>
                      <div className="flex gap-2 mb-3">
                        {([true, false] as const).map(val => (
                          <button key={String(val)}
                            onClick={() => setPatch({ formationChanged: halfTime.formationChanged === val ? null : val })}
                            className="flex-1 py-3 font-sans font-semibold text-[13px] border transition-all theme-transition"
                            style={halfTime.formationChanged === val
                              ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                              : { background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                            {val ? 'Yes' : 'No'}
                          </button>
                        ))}
                      </div>
                      {halfTime.formationChanged === true && (
                        <div className="flex flex-wrap gap-1.5">
                          {FORMATIONS.map(f => (
                            <button key={f.name}
                              onClick={() => setPatch({ newFormation: halfTime.newFormation === f.name ? null : f.name })}
                              className="px-3 py-2 border font-mono text-[10px] tracking-wider transition-all theme-transition"
                              style={halfTime.newFormation === f.name
                                ? { background: primary, borderColor: primary, color: 'var(--dark)', fontWeight: 700 }
                                : { background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`, color: 'var(--muted)' }}>
                              {f.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Tactical Shift (flex-[2]) ── */}
                    <div
                      className="flex flex-col px-4 py-5 border-b"
                      style={{ flex: '2 1 0', borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[2px] mb-4" style={{ color: 'var(--muted)' }}>Tactical Shift</p>
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        {([
                          { val: 'hold',   icon: '🛡️', label: 'Hold On',   desc: 'Defend lead' },
                          { val: 'same',   icon: '⚖️', label: 'Same',      desc: 'No change'   },
                          { val: 'attack', icon: '⚡', label: 'Go For It', desc: 'All out'     },
                        ] as const).map(opt => {
                          const active = halfTime.tacticalShift === opt.val;
                          return (
                            <button key={opt.val}
                              onClick={() => setPatch({ tacticalShift: halfTime.tacticalShift === opt.val ? null : opt.val })}
                              className="flex flex-col items-center justify-center gap-2 border transition-all theme-transition"
                              style={{
                                background: active ? `color-mix(in srgb, ${primary} 14%, transparent)` : 'var(--dark)',
                                borderColor: active ? primary : `color-mix(in srgb, ${primary} 15%, transparent)`,
                                boxShadow: active ? `inset 0 -3px 0 ${primary}` : 'none',
                              }}>
                              <span className="text-2xl leading-none">{opt.icon}</span>
                              <span className="font-sans font-semibold text-[13px] leading-none theme-transition" style={{ color: active ? primary : 'var(--text)' }}>{opt.label}</span>
                              <span className="font-mono text-[10px] text-center" style={{ color: 'var(--muted)' }}>{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── 2nd Half Result (flex-1) ── */}
                    <div
                      className="flex flex-col px-4 py-5 border-b"
                      style={{ flex: '1 1 0', borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--muted)' }}>2nd Half Result</p>
                        <span className="font-mono text-[9px] px-2 py-0.5 font-bold theme-transition"
                          style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}>
                          4 pts
                        </span>
                      </div>
                      <div className="flex gap-2 flex-1">
                        {(['home', 'draw', 'away'] as const).map(opt => (
                          <button key={opt}
                            onClick={() => setPatch({ secondHalfResult: halfTime.secondHalfResult === opt ? null : opt })}
                            className="flex-1 font-sans font-semibold text-[13px] border transition-all theme-transition capitalize"
                            style={halfTime.secondHalfResult === opt
                              ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                              : { background: 'var(--dark3)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Next Goalscorer (flex-1) ── */}
                    <div className="flex flex-col px-4 py-5" style={{ flex: '1 1 0' }}>
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--muted)' }}>
                          Next Goalscorer
                        </p>
                        <span className="font-mono text-[9px] px-2 py-0.5 font-bold theme-transition"
                          style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}>
                          8 pts
                        </span>
                      </div>
                      <select
                        value={halfTime.nextGoalscorer ?? ''}
                        onChange={e => setPatch({ nextGoalscorer: e.target.value || null })}
                        className="w-full px-3 py-3 border font-sans font-semibold text-[13px] focus:outline-none transition-colors"
                        style={{
                          background: 'var(--dark3)',
                          borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
                          color: halfTime.nextGoalscorer ? 'var(--text)' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        <option value="">— Pick a player —</option>
                        {[...lineupPlayers, ...benchPlayers].map(p => (
                          <option key={p.name} value={p.name}>{p.name} #{p.number}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                );
              })()}

              {/* ── HISTORY TAB ── */}
              {rightTab === 'history' && (
                <div className="p-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <p className="font-mono text-[10px] uppercase tracking-[3px] theme-transition" style={{ color: primary }}>
                      Past Locks
                    </p>
                    <button
                      onClick={fetchHistory}
                      className="font-mono text-[10px] uppercase tracking-widest transition-colors"
                      style={{ color: 'var(--muted)', background: 'none', border: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = primary)}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                    >
                      Refresh ↺
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <span className="text-3xl">📋</span>
                      <p className="font-mono text-[11px] text-center" style={{ color: 'var(--muted)' }}>
                        No locked predictions yet.<br />Lock your first XI to see it here.
                      </p>
                    </div>
                  ) : (
                    history.map(save => {
                      const placed = Object.keys(save.lineup_data ?? {}).length;
                      const isComplete = placed === 11;
                      return (
                        <div
                          key={save.id}
                          onClick={() => { setLineup(save.lineup_data); setTactics(save.tactics_data); setRightTab('tactics'); }}
                          className="p-4 border transition-all theme-transition cursor-pointer group"
                          style={{ background: 'var(--dark)', borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`, borderLeft: `3px solid ${primary}` }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${primary} 5%, transparent)`; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--dark)'; }}
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-sans font-semibold text-[13px]" style={{ color: 'var(--text)' }}>
                              Match #{save.match_id}
                            </span>
                            <span
                              className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 font-bold"
                              style={{
                                background: isComplete ? `color-mix(in srgb, var(--success) 12%, transparent)` : `color-mix(in srgb, ${primary} 12%, transparent)`,
                                color: isComplete ? 'var(--success)' : primary,
                                border: `1px solid ${isComplete ? 'var(--success)' : primary}40`,
                              }}
                            >
                              🔒 LOCKED
                            </span>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Players placed indicator */}
                              <div className="flex gap-0.5">
                                {Array.from({ length: 11 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-1.5 h-3 rounded-sm theme-transition"
                                    style={{ background: i < placed ? primary : `color-mix(in srgb, ${primary} 15%, transparent)` }}
                                  />
                                ))}
                              </div>
                              <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                                {placed}/11
                              </span>
                            </div>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                              {new Date(save.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Load label */}
                          <div className="mt-2 font-mono text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity theme-transition" style={{ color: primary }}>
                            Click to restore →
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* ── LOCK BUTTON (pinned bottom) ── */}
            <div
              className="p-4 border-t mt-auto flex flex-col gap-2"
              style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}
            >
              {lockMsg && (
                <div
                  className="py-2 px-3 font-mono text-[11px] text-center border theme-transition"
                  style={{
                    borderColor: lockMsg.ok ? 'var(--success)' : 'var(--red)',
                    color:       lockMsg.ok ? 'var(--success)' : 'var(--red)',
                    background:  lockMsg.ok ? 'rgba(0,255,133,0.07)' : 'rgba(255,45,85,0.07)',
                  }}
                >
                  {lockMsg.text}
                </div>
              )}

              {/* Progress indicator */}
              <div className="flex items-center justify-between font-mono text-[10px] mb-1" style={{ color: 'var(--muted)' }}>
                <span>Starting XI</span>
                <span className="theme-transition" style={{ color: placedCount === 11 ? 'var(--success)' : primary }}>
                  {placedCount}/11 placed
                </span>
              </div>
              <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full theme-transition"
                  style={{
                    width: `${(placedCount / 11) * 100}%`,
                    background: placedCount === 11 ? 'var(--success)' : primary,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <button
                onClick={handleLockSelection}
                className="w-full py-3 font-display text-xl uppercase tracking-widest btn-cut-lg transition-all active:scale-95 theme-transition mt-1"
                style={{
                  background: primary,
                  color: 'var(--dark)',
                  boxShadow: `0 0 24px color-mix(in srgb, ${primary} 55%, transparent)`,
                  fontSize: '20px',
                }}
              >
                Lock Prediction 🔒
              </button>
            </div>
          </div>

        </div>
      </DndContext>
    </div>
  );
}
