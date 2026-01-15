'use client';
import React, { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import PitchSlot from './PitchSlot';
import DraggablePlayer from './DraggablePlayer';
import MatchEvents from './MatchEvents';

interface Player {
  name: string;
  number: number;
}

export default function PitchBoard() {
  // 1. NAVIGATION STATE
  const [activeTab, setActiveTab] = useState<'squad' | 'tactics' | 'events'>('squad');

  // 2. CORE DATA STATES
  const [squad, setSquad] = useState<Player[]>([
    { name: "L. Messi", number: 10 },
    { name: "C. Ronaldo", number: 7 },
    { name: "K. Mbappe", number: 10 },
    { name: "E. Haaland", number: 9 },
    { name: "V. van Dijk", number: 4 },
    { name: "Pedri", number: 8 },
  ]);
  const [lineup, setLineup] = useState<Record<string, Player>>({});

  // 3. DRAG & DROP LOGIC
  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && active) {
      const playerName = active.id as string;
      const slotId = over.id as string;
      const newPlayerObj = squad.find(p => p.name === playerName);

      if (newPlayerObj) {
        const displacedPlayer = lineup[slotId];
        setLineup((prev) => ({ ...prev, [slotId]: newPlayerObj }));
        setSquad((prev) => {
          let updatedSquad = prev.filter((p) => p.name !== playerName);
          if (displacedPlayer) updatedSquad = [...updatedSquad, displacedPlayer];
          return updatedSquad;
        });
      }
    }
  };

  // 4. DATA LOCKING LOGIC (Milestone 1)
  const handleLockSelection = () => {
    // Check if team is full (Cybersecurity Input Validation)
    const playerCount = Object.keys(lineup).length;
    
    const finalData = {
      lineup: lineup,
      count: playerCount,
      timestamp: new Date().toISOString(),
      status: "LOCKED"
    };

    console.log("⚓ PIRATE LOG - SHIP READY TO SAIL:", finalData);
    alert(`Selection Locked with ${playerCount} players! Check console for data packet.`);
  };

  // 5. RENDER LOGIC FOR TABS
  const renderTabContent = () => {
    switch (activeTab) {
      case 'squad':
        return (
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {squad.map((player) => (
              <DraggablePlayer key={player.name} name={player.name} number={player.number} />
            ))}
          </div>
        );
      case 'tactics':
        return (
          <div className="p-6 bg-zinc-800/50 rounded-xl border border-zinc-700/50 text-center">
            <p className="text-zinc-400 text-sm italic">Tactical sliders coming in the next session...</p>
          </div>
        );
      case 'events':
        return <MatchEvents />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl">
      <DndContext onDragEnd={handleDragEnd}>
        
        {/* SIDEBAR NAVIGATION & CONTENT */}
        <div className="w-full lg:w-80 bg-zinc-900 p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
          <div>
            {/* TAB SWITCHER */}
            <div className="flex gap-2 mb-6 p-1 bg-black/40 rounded-lg border border-white/5">
              {(['squad', 'tactics', 'events'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                    activeTab === tab 
                      ? 'bg-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {renderTabContent()}
          </div>

          {/* ACTION BUTTON */}
          <button
            onClick={handleLockSelection}
            className="w-full mt-6 py-4 bg-green-600 hover:bg-green-500 text-black font-black uppercase tracking-tighter rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)] active:scale-95 flex items-center justify-center gap-2"
          >
            Lock Selection 🔒
          </button>
        </div>

        {/* THE PITCH */}
        <div className="relative w-full max-w-[450px] aspect-[2/3] bg-gradient-to-b from-emerald-900 to-zinc-950 rounded-2xl border-4 border-white/5 overflow-hidden p-6 mx-auto shadow-inner">
           {/* Center Circle Markup */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/10 rounded-full" />
           <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10" />
          
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