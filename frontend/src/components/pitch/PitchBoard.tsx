'use client';
import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import PitchSlot from './PitchSlot';
import DraggablePlayer from './DraggablePlayer';
import MatchEvents, { OutcomesState, PlayerPredictionsState } from './MatchEvents';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { FORMATIONS, DEFAULT_FORMATION, FormationLayout } from '@/src/data/formations';

interface Player {
  name: string;
  number: number;
}

export default function PitchBoard() {
  const { primary } = useTheme();
  const { user, token } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'squad' | 'tactics' | 'events' | 'history'>('squad');
  const [formation, setFormation] = useState<FormationLayout>(DEFAULT_FORMATION);
  const [tactics, setTactics] = useState({ mentality: 50, lineHeight: 50, width: 50 });
  const [squad, setSquad] = useState<Player[]>([
    { name: "L. Messi", number: 10 },
    { name: "C. Ronaldo", number: 7 },
    { name: "K. Mbappe", number: 10 },
    { name: "E. Haaland", number: 9 },
    { name: "V. van Dijk", number: 4 },
    { name: "Pedri", number: 8 },
  ]);
  const [lineup, setLineup] = useState<Record<string, Player>>({});
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

  useEffect(() => { setIsMounted(true); }, []);

  // When formation changes, return all on-pitch players whose slots no longer
  // exist in the new formation back to the bench
  const handleFormationChange = (f: FormationLayout) => {
    const newSlots = f.slots.flat();
    const displaced: Player[] = [];
    const newLineup: Record<string, Player> = {};
    Object.entries(lineup).forEach(([slot, player]) => {
      if (newSlots.includes(slot)) {
        newLineup[slot] = player;
      } else {
        displaced.push(player);
      }
    });
    setFormation(f);
    setLineup(newLineup);
    if (displaced.length > 0) setSquad(prev => [...prev, ...displaced]);
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/predictions/history/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) setHistory(await response.json());
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const loadSavedPrediction = (saved: any) => {
    setLineup(saved.lineup_data);
    setTactics(saved.tactics_data);
    setActiveTab('squad');
  };

  const handleLockSelection = async () => {
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
      status: "LOCKED",
    };
    try {
      const userId = user?.id ?? 1;
      const response = await fetch(`http://localhost:8000/predictions/lock/101?user_id=${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(finalData),
      });
      if (response.ok) {
        alert("✅ Selection Locked in the Database!");
        fetchHistory();
      }
    } catch {
      alert("❌ Connection Error: Is FastAPI running?");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const playerFromBench = squad.find(p => p.name === activeId);
    if (playerFromBench) {
      const displacedPlayer = lineup[overId];
      setLineup(prev => ({ ...prev, [overId]: playerFromBench }));
      setSquad(prev => {
        let newSquad = prev.filter(p => p.name !== activeId);
        if (displacedPlayer) newSquad = [...newSquad, displacedPlayer];
        return newSquad;
      });
      return;
    }

    const sourceSlot = Object.keys(lineup).find(key => lineup[key].name === activeId);
    if (sourceSlot && sourceSlot !== overId) {
      const movingPlayer = lineup[sourceSlot];
      const targetPlayer = lineup[overId];
      setLineup(prev => {
        const next = { ...prev };
        if (targetPlayer) next[sourceSlot] = targetPlayer;
        else delete next[sourceSlot];
        next[overId] = movingPlayer;
        return next;
      });
    }
  };

  const handleResetPitch = () => {
    setSquad(prev => [...prev, ...Object.values(lineup)]);
    setLineup({});
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'squad':
        return (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {squad.length === 0 && (
              <p className="text-[10px] text-zinc-500 italic text-center py-4">All players on pitch</p>
            )}
            {squad.map((p) => (
              <DraggablePlayer key={p.name} id={p.name} name={p.name} number={p.number} />
            ))}
          </div>
        );

      case 'tactics':
        return (
          <div className="flex flex-col gap-5">
            {/* Formation Selector */}
            <div className="p-4 bg-zinc-800/40 rounded-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: primary }}>
                Formation
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {FORMATIONS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => handleFormationChange(f)}
                    className="py-2 px-1 text-[10px] font-black uppercase rounded-lg border transition-all"
                    style={
                      formation.name === f.name
                        ? { backgroundColor: primary, borderColor: primary, color: '#000' }
                        : { borderColor: '#3f3f46', color: '#71717a' }
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Formation visual preview */}
              <div className="mt-3 flex flex-col gap-1 items-center">
                {formation.slots.map((row, i) => (
                  <div key={i} className="flex gap-1 justify-center">
                    {row.map(slot => (
                      <div key={slot}
                        className="w-6 h-6 rounded-full border text-[7px] font-bold flex items-center justify-center"
                        style={{
                          borderColor: primary,
                          color: lineup[slot] ? '#000' : primary,
                          backgroundColor: lineup[slot] ? primary : 'transparent',
                        }}>
                        {slot.replace(/[0-9]/g, '')}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Sliders */}
            <div className="p-4 bg-zinc-800/40 rounded-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: primary }}>
                Strategy Sliders
              </h3>
              {['mentality', 'lineHeight', 'width'].map((trait) => (
                <div key={trait} className="space-y-2 mb-4 last:mb-0">
                  <div className="flex justify-between text-[10px] font-bold text-white uppercase">
                    <span>{trait}</span>
                    <span style={{ color: primary }}>{(tactics as any)[trait]}</span>
                  </div>
                  <input
                    type="range" min="0" max="100"
                    value={(tactics as any)[trait]}
                    onChange={(e) => setTactics({ ...tactics, [trait]: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: primary }}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: primary }}>Past Tactics</h3>
              <button onClick={fetchHistory} className="text-[9px] text-zinc-500 uppercase hover:text-white transition-colors">Refresh ↺</button>
            </div>
            {history.length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic">No saved data found in logbook.</p>
            ) : (
              history.map((save) => (
                <div key={save.id} onClick={() => loadSavedPrediction(save)}
                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer transition-all group"
                  onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white text-[10px] font-bold uppercase">Match #{save.match_id}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">{new Date(save.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-[9px] text-zinc-500">
                    <span>{Object.keys(save.lineup_data).length} Players Set</span>
                    <span className="group-hover:text-white">Load ⚓</span>
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
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl">
      <DndContext onDragEnd={handleDragEnd}>
        {/* SIDEBAR */}
        <div className="w-full lg:w-80 bg-zinc-900 p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between shadow-xl">
          <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-lg">
              {(['squad', 'tactics', 'history', 'events'] as const).map((tab) => (
                <button key={tab}
                  onClick={() => { setActiveTab(tab); if (tab === 'history') fetchHistory(); }}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-md transition-all ${
                    activeTab === tab ? 'shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  style={activeTab === tab ? { backgroundColor: primary, color: '#000' } : {}}
                >
                  {tab}
                </button>
              ))}
            </div>
            {renderTabContent()}
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button onClick={handleResetPitch}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-black uppercase rounded-xl border border-zinc-700 transition-all">
              Reset Pitch ↺
            </button>
            <button onClick={handleLockSelection}
              className="w-full py-4 font-black uppercase rounded-xl active:scale-95 transition-transform shadow-lg"
              style={{ backgroundColor: primary, color: '#000' }}>
              Lock Selection 🔒
            </button>
          </div>
        </div>

        {/* PITCH — renders dynamically from selected formation */}
        <div className="relative w-full max-w-[450px] aspect-[2/3] bg-emerald-900/5 rounded-2xl border-4 border-white/5 p-6 mx-auto">
          {/* Pitch markings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/5 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 pointer-events-none" />

          {/* Formation label */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest pointer-events-none"
            style={{ color: `${primary}80` }}>
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
  );
}
