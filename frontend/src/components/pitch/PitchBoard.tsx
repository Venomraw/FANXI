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

// Generic bench while squad is loading
const PLACEHOLDER_SQUAD: Player[] = [
  { name: 'GK #1',  number: 1,  position: 'GK'  },
  { name: 'RB #2',  number: 2,  position: 'RB'  },
  { name: 'CB #3',  number: 3,  position: 'CB'  },
  { name: 'CB #4',  number: 4,  position: 'CB'  },
  { name: 'LB #5',  number: 5,  position: 'LB'  },
  { name: 'CDM #6', number: 6,  position: 'CDM' },
  { name: 'CM #8',  number: 8,  position: 'CM'  },
  { name: 'CAM #10',number: 10, position: 'CAM' },
  { name: 'RW #7',  number: 7,  position: 'RW'  },
  { name: 'ST #9',  number: 9,  position: 'ST'  },
  { name: 'LW #11', number: 11, position: 'LW'  },
];

export default function PitchBoard() {
  const { primary, team } = useTheme();
  const { user, token } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'squad' | 'tactics' | 'events' | 'history'>('squad');
  const [formation, setFormation] = useState<FormationLayout>(DEFAULT_FORMATION);
  const [tactics, setTactics] = useState({ mentality: 50, lineHeight: 50, width: 50 });

  // ── Squad state ────────────────────────────────────────────────────────────
  const [squad, setSquad]           = useState<Player[]>(PLACEHOLDER_SQUAD);
  const [squadLoading, setSquadLoading] = useState(false);
  const [lineup, setLineup]         = useState<Record<string, Player>>({});

  // ── Match selector ─────────────────────────────────────────────────────────
  const [selectedMatch, setSelectedMatch] = useState<WCMatch | null>(null);

  // ── Predictions ────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<any[]>([]);
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

  // ── Lock feedback ──────────────────────────────────────────────────────────
  const [lockMsg, setLockMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // ── Fetch squad when team changes ──────────────────────────────────────────
  const loadSquad = useCallback(async (teamName: string) => {
    setSquadLoading(true);
    try {
      const res  = await fetch(`http://localhost:8000/squad/${encodeURIComponent(teamName)}`);
      const data = await res.json();
      const players: Player[] = (data.players ?? []).map((p: any) => ({
        name:     p.name,
        number:   p.number ?? 0,
        position: p.position,
      }));
      if (players.length > 0) {
        setSquad(players);
        setLineup({});   // reset pitch when team changes
      }
    } catch {
      // keep current squad on network error
    } finally {
      setSquadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (team?.name) loadSquad(team.name);
  }, [team?.name, loadSquad]);

  // ── Formation change ───────────────────────────────────────────────────────
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

  // ── History ────────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/predictions/history/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setHistory(await res.json());
    } catch { /* swallow */ }
  };

  const loadSavedPrediction = (saved: any) => {
    setLineup(saved.lineup_data);
    setTactics(saved.tactics_data);
    setActiveTab('squad');
  };

  // ── Lock selection ─────────────────────────────────────────────────────────
  const handleLockSelection = async () => {
    const matchId = selectedMatch?.id ?? 1001;
    const finalData = {
      lineup,
      tactics,
      outcomes: {
        match_result: outcomes.matchResult,
        correct_score: outcomes.correctScore,
        btts: outcomes.btts,
        over_under: outcomes.overUnder,
        ht_ft: outcomes.htFt,
      },
      player_predictions: {
        first_goalscorer: playerPredictions.firstGoalscorer,
        anytime_goalscorer: playerPredictions.anytimeGoalscorer,
        player_assist: playerPredictions.playerAssist,
        player_carded: playerPredictions.playerCarded,
        shots_on_target: playerPredictions.shotsOnTarget,
        man_of_the_match: playerPredictions.manOfTheMatch,
      },
      timestamp: new Date().toISOString(),
      status: 'LOCKED',
    };
    try {
      const userId = user?.id ?? 1;
      const res = await fetch(
        `http://localhost:8000/predictions/lock/${matchId}?user_id=${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(finalData),
        }
      );
      if (res.ok) {
        setLockMsg({ ok: true, text: `🔒 Locked for ${selectedMatch?.home_team ?? 'Match'} vs ${selectedMatch?.away_team ?? '—'}` });
        fetchHistory();
      } else {
        setLockMsg({ ok: false, text: '❌ Lock failed — try again.' });
      }
    } catch {
      setLockMsg({ ok: false, text: '❌ Connection error — is the server running?' });
    }
    setTimeout(() => setLockMsg(null), 4000);
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId   = over.id   as string;

    // Bench → pitch
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

    // Pitch → pitch swap
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

  // ── Tab content ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {

      case 'squad':
        return (
          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            {squadLoading && (
              <p className="font-mono text-[11px] uppercase tracking-widest text-center py-4 theme-transition"
                style={{ color: primary }}>
                Scouting squad...
              </p>
            )}
            {!squadLoading && squad.length === 0 && (
              <p className="font-mono text-[11px] italic text-center py-4" style={{ color: 'var(--muted)' }}>
                All players on pitch
              </p>
            )}
            {squad.map(p => (
              <DraggablePlayer key={p.name} id={p.name} name={p.name} number={p.number} />
            ))}
          </div>
        );

      case 'tactics':
        return (
          <div className="flex flex-col gap-4">
            {/* Formation Selector */}
            <div className="p-4 border theme-transition"
              style={{
                background: 'var(--dark2)',
                borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
              }}>
              <h3 className="font-mono text-[11px] uppercase tracking-[3px] mb-3 theme-transition"
                style={{ color: primary }}>Formation</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {FORMATIONS.map(f => (
                  <button key={f.name} onClick={() => handleFormationChange(f)}
                    className="py-2 px-1 font-mono text-[10px] uppercase tracking-wider border transition-all theme-transition btn-cut"
                    style={formation.name === f.name
                      ? { background: primary, borderColor: primary, color: 'var(--dark)' }
                      : { borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`, color: 'var(--muted)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Formation mini-preview */}
              <div className="mt-3 flex flex-col gap-1 items-center">
                {formation.slots.map((row, i) => (
                  <div key={i} className="flex gap-1 justify-center">
                    {row.map(slot => (
                      <div key={slot}
                        className="w-5 h-5 border font-mono text-[6px] flex items-center justify-center transition-all theme-transition"
                        style={{
                          borderColor: primary,
                          color: lineup[slot] ? 'var(--dark)' : primary,
                          background: lineup[slot] ? primary : 'transparent',
                        }}>
                        {slot.replace(/[0-9]/g, '')}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Sliders */}
            <div className="p-4 border theme-transition"
              style={{
                background: 'var(--dark2)',
                borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
              }}>
              <h3 className="font-mono text-[11px] uppercase tracking-[3px] mb-4 theme-transition"
                style={{ color: primary }}>Strategy</h3>
              {(['mentality', 'lineHeight', 'width'] as const).map(trait => (
                <div key={trait} className="mb-4 last:mb-0">
                  <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider mb-1.5">
                    <span style={{ color: 'var(--muted)' }}>{trait}</span>
                    <span className="theme-transition" style={{ color: primary }}>{tactics[trait]}</span>
                  </div>
                  <input type="range" min="0" max="100"
                    value={tactics[trait]}
                    onChange={e => setTactics({ ...tactics, [trait]: +e.target.value })}
                    className="w-full h-0.5 appearance-none"
                    style={{ accentColor: primary, background: `linear-gradient(to right, ${primary} 0%, ${primary} ${tactics[trait]}%, var(--mid) ${tactics[trait]}%)` }}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-mono text-[11px] uppercase tracking-[3px] theme-transition"
                style={{ color: primary }}>Past Locks</h3>
              <button onClick={fetchHistory}
                className="font-mono text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = primary)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                Refresh ↺
              </button>
            </div>
            {history.length === 0 ? (
              <p className="font-mono text-[11px] italic py-4 text-center" style={{ color: 'var(--muted)' }}>
                No saved data in logbook.
              </p>
            ) : (
              history.map(save => (
                <div key={save.id} onClick={() => loadSavedPrediction(save)}
                  className="p-3 border transition-all theme-transition"
                  style={{
                    background: 'var(--dark2)',
                    borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = primary}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${primary} 12%, transparent)`}>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--text)' }}>
                      Match #{save.match_id}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      {new Date(save.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1.5 font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                    <span>{Object.keys(save.lineup_data).length} players placed</span>
                    <span className="theme-transition" style={{ color: primary }}>Load ⚓</span>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'events': {
        const allPlayers = [...squad, ...Object.values(lineup)];
        return (
          <MatchEvents
            outcomes={outcomes}
            onChange={setOutcomes}
            playerPredictions={playerPredictions}
            onPlayerChange={setPlayerPredictions}
            allPlayers={allPlayers}
          />
        );
      }
      default: return null;
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col gap-4">

      {/* ── MATCH SELECTOR ────────────────────────────────────────────────── */}
      <div className="border theme-transition p-4"
        style={{
          background: 'var(--dark3)',
          borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
        }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[3px]" style={{ color: 'var(--muted)' }}>
            Select Match to Predict
          </p>
          {selectedMatch && (
            <p className="font-mono text-xs font-bold theme-transition" style={{ color: primary }}>
              {selectedMatch.home_team} vs {selectedMatch.away_team}
            </p>
          )}
        </div>
        <MatchSelector
          selectedId={selectedMatch?.id ?? null}
          onSelect={m => setSelectedMatch(m)}
        />
      </div>

      {/* ── PITCH + SIDEBAR ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 p-5 border theme-transition"
        style={{
          background: 'var(--dark3)',
          borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
        }}>
        <DndContext onDragEnd={handleDragEnd}>

          {/* SIDEBAR */}
          <div className="w-full lg:w-72 border theme-transition flex flex-col justify-between p-4"
            style={{
              background: 'var(--dark2)',
              borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`,
            }}>
            <div>
              {/* Tabs */}
              <div className="flex gap-px mb-5 border-b"
                style={{ borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}>
                {(['squad', 'tactics', 'history', 'events'] as const).map(tab => (
                  <button key={tab}
                    onClick={() => { setActiveTab(tab); if (tab === 'history') fetchHistory(); }}
                    className="flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-all theme-transition"
                    style={activeTab === tab
                      ? { background: primary, color: 'var(--dark)' }
                      : { color: 'var(--muted)' }}>
                    {tab}
                  </button>
                ))}
              </div>
              {renderTabContent()}
            </div>

            {/* Lock feedback */}
            {lockMsg && (
              <div className="mt-3 py-2 px-3 font-mono text-xs text-center border theme-transition"
                style={{
                  borderColor: lockMsg.ok ? primary : '#FF2D55',
                  color: lockMsg.ok ? primary : '#FF2D55',
                  background: lockMsg.ok
                    ? `color-mix(in srgb, ${primary} 8%, transparent)`
                    : 'rgba(255,45,85,0.08)',
                }}>
                {lockMsg.text}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={handleResetPitch}
                className="w-full py-2.5 font-mono text-[10px] uppercase tracking-widest border transition-all theme-transition"
                style={{
                  borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
                  color: 'var(--muted)',
                  background: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 15%, transparent)`)}>
                Reset Pitch ↺
              </button>
              <button onClick={handleLockSelection}
                className="w-full py-3 font-display text-2xl uppercase tracking-widest btn-cut-lg transition-all active:scale-95 theme-transition"
                style={{ background: primary, color: 'var(--dark)' }}>
                Lock Selection 🔒
              </button>
            </div>
          </div>

          {/* PITCH */}
          <div className="relative w-full max-w-[440px] aspect-[2/3] mx-auto p-5 border"
            style={{
              background: `linear-gradient(160deg, #071207 0%, #0a1a0a 50%, #071207 100%)`,
              borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
              backgroundImage: [
                `linear-gradient(color-mix(in srgb, ${primary} 3%, transparent) 1px, transparent 1px)`,
                `linear-gradient(90deg, color-mix(in srgb, ${primary} 2.5%, transparent) 1px, transparent 1px)`,
                `linear-gradient(160deg, #071207 0%, #0a1a0a 50%, #071207 100%)`,
              ].join(', '),
              backgroundSize: '36px 36px, 36px 36px, 100% 100%',
            }}>

            {/* Pitch markings */}
            <div className="absolute top-1/2 left-8 right-8 h-px pointer-events-none"
              style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)` }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border pointer-events-none"
              style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }} />
            <div className="absolute top-0 left-1/4 right-1/4 h-16 border-b border-l border-r pointer-events-none"
              style={{ borderColor: `color-mix(in srgb, ${primary} 8%, transparent)` }} />
            <div className="absolute bottom-0 left-1/4 right-1/4 h-16 border-t border-l border-r pointer-events-none"
              style={{ borderColor: `color-mix(in srgb, ${primary} 8%, transparent)` }} />

            {/* Formation label */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[3px] pointer-events-none theme-transition"
              style={{ color: `color-mix(in srgb, ${primary} 70%, transparent)` }}>
              {formation.label}
            </div>

            <div className="relative h-full flex flex-col justify-between z-10">
              {formation.slots.map((row, rowIdx) => (
                <div key={rowIdx}
                  className={`flex ${row.length === 1 ? 'justify-center' : 'justify-around'}`}>
                  {row.map(slotId => (
                    <PitchSlot key={slotId} id={slotId} player={lineup[slotId]} />
                  ))}
                </div>
              ))}
            </div>
          </div>

        </DndContext>
      </div>
    </div>
  );
}
