'use client';
import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import PitchSlot from './PitchSlot';
import DraggablePlayer from './DraggablePlayer';
import MatchEvents from './MatchEvents';

interface Player {
  name: string;
  number: number;
}

export default function PitchBoard() {
  const [isMounted, setIsMounted] = useState(false);

  // 1. UPDATED STATES
  const [activeTab, setActiveTab] = useState<'squad' | 'tactics' | 'events' | 'history'>('squad');
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. BACKEND INTEGRATION LOGIC
  const fetchHistory = async () => {
    try {
      // Endpoint matches our FastAPI router
      const response = await fetch("http://localhost:8000/predictions/history/1");
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const loadSavedPrediction = (saved: any) => {
    // Restores both the 11 players and the slider positions
    setLineup(saved.lineup_data);
    setTactics(saved.tactics_data);
    setActiveTab('squad'); 
    console.log("⚓ Tactical snapshot restored to pitch.");
  };

  const handleLockSelection = async () => {
    const finalData = {
      lineup,
      tactics,
      timestamp: new Date().toISOString(),
      status: "LOCKED"
    };

    try {
      const response = await fetch("http://localhost:8000/predictions/lock/101", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });

      if (response.ok) {
        alert("✅ Selection Locked in the Database!");
        fetchHistory(); // Refresh history immediately after saving
      }
    } catch (error) {
      alert("❌ Connection Error: Is FastAPI running?");
    }
  };

  // 3. DRAG LOGIC
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
    const playersOnPitch = Object.values(lineup);
    setSquad((prev) => [...prev, ...playersOnPitch]);
    setLineup({});
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'squad':
        return (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {squad.map((p) => <DraggablePlayer key={p.name} id={p.name} name={p.name} number={p.number} />)}
          </div>
        );
      case 'tactics':
        return (
          <div className="flex flex-col gap-6 p-4 bg-zinc-800/40 rounded-xl">
            <h3 className="text-[10px] font-black text-green-500 uppercase tracking-widest">Strategy Sliders</h3>
            {['mentality', 'lineHeight', 'width'].map((trait) => (
              <div key={trait} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-white uppercase">
                  <span>{trait}</span>
                  <span className="text-green-500">{(tactics as any)[trait]}</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={(tactics as any)[trait]}
                  onChange={(e) => setTactics({...tactics, [trait]: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none accent-green-500 cursor-pointer"
                />
              </div>
            ))}
          </div>
        );
      case 'history':
        return (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] font-black text-green-500 uppercase tracking-widest">Past Tactics</h3>
              <button onClick={fetchHistory} className="text-[9px] hover:text-green-400 text-zinc-500 uppercase">Refresh ↺</button>
            </div>
            {history.length === 0 ? (
              <p className="text-[10px] text-zinc-500 italic">No saved data found in logbook.</p>
            ) : (
              history.map((save) => (
                <div key={save.id} onClick={() => loadSavedPrediction(save)}
                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-green-600 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white text-[10px] font-bold uppercase">Match #{save.match_id}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">{new Date(save.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-[9px] text-zinc-500">
                    <span>{Object.keys(save.lineup_data).length} Players Set</span>
                    <span className="group-hover:text-green-500">Load ⚓</span>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'events':
        return <MatchEvents />;
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
            <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-lg">
              {(['squad', 'tactics', 'history', 'events'] as const).map((tab) => (
                <button key={tab} 
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'history') fetchHistory(); // Fetch on click
                  }}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-md transition-all ${
                    activeTab === tab ? 'bg-green-600 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                > {tab} </button>
              ))}
            </div>
            {renderTabContent()}
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button onClick={handleResetPitch} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-black uppercase rounded-xl border border-zinc-700 transition-all">
              Reset Pitch ↺
            </button>
            <button onClick={handleLockSelection} className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-black uppercase rounded-xl active:scale-95 transition-transform shadow-lg shadow-green-900/20">
              Lock Selection 🔒
            </button>
          </div>
        </div>

        {/* PITCH UI */}
        <div className="relative w-full max-w-[450px] aspect-[2/3] bg-emerald-900/5 rounded-2xl border-4 border-white/5 p-6 mx-auto">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/5 rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 pointer-events-none" />
          <div className="relative h-full flex flex-col justify-between z-10">
            <div className="flex justify-around"><PitchSlot id="LW" player={lineup["LW"]} /><PitchSlot id="ST" player={lineup["ST"]} /><PitchSlot id="RW" player={lineup["RW"]} /></div>
            <div className="flex justify-center gap-16"><PitchSlot id="LCM" player={lineup["LCM"]} /><PitchSlot id="RCM" player={lineup["RCM"]} /></div>
            <div className="flex justify-center"><PitchSlot id="CDM" player={lineup["CDM"]} /></div>
            <div className="flex justify-between px-2"><PitchSlot id="LB" player={lineup["LB"]} /><PitchSlot id="CB1" player={lineup["CB1"]} /><PitchSlot id="CB2" player={lineup["CB2"]} /><PitchSlot id="RB" player={lineup["RB"]} /></div>
            <div className="flex justify-center"><PitchSlot id="GK" player={lineup["GK"]} /></div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}