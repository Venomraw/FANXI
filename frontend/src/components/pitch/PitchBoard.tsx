'use client';
import React, { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import PitchSlot from './PitchSlot';
import DraggablePlayer from './DraggablePlayer';

export default function PitchBoard() {
  // --- SQUAD STATE: Players not yet on the pitch ---
  const [squad, setSquad] = useState([
    "L. Messi", "C. Ronaldo", "Neymar Jr", "K. Mbappe", 
    "E. Haaland", "K. De Bruyne", "Pedri", "V. van Dijk", 
    "R. Araujo", "J. Kounde", "Ter Stegen"
  ]);

  // --- LINEUP STATE: Mapping slots to player names ---
  const [lineup, setLineup] = useState<Record<string, string>>({});

  // --- THE LOGIC: What happens when you let go of a player ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;

    // If we dropped over a valid PitchSlot
    if (over && active) {
      const playerName = active.id as string;
      const slotId = over.id as string;

      // 1. Update the lineup with the new placement
      setLineup((prev) => ({ ...prev, [slotId]: playerName }));

      // 2. Remove the player from the available squad list
      setSquad((prev) => prev.filter((p) => p !== playerName));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-8 bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl">
      <DndContext onDragEnd={handleDragEnd}>
        
        {/* --- LEFT SIDE: THE SQUAD BENCH --- */}
        <div className="w-full lg:w-64 bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-inner">
          <h3 className="text-xs font-black text-zinc-500 mb-6 uppercase tracking-[0.2em]">
            Available Squad
          </h3>
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {squad.map((name) => (
              <DraggablePlayer key={name} name={name} />
            ))}
          </div>
        </div>

        {/* --- RIGHT SIDE: THE PITCH VISUALIZER --- */}
        <div className="relative w-full max-w-[450px] aspect-[2/3] bg-gradient-to-b from-emerald-900 to-zinc-950 rounded-2xl border-4 border-white/5 overflow-hidden p-6 mx-auto">
          {/* Pitch Markings Mockup */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/10 rounded-full" />

          {/* 4-3-3 TACTICAL GRID */}
          <div className="relative h-full flex flex-col justify-between">
            {/* Attack */}
            <div className="flex justify-around">
              <PitchSlot id="LW" player={lineup["LW"]} />
              <PitchSlot id="ST" player={lineup["ST"]} />
              <PitchSlot id="RW" player={lineup["RW"]} />
            </div>
            {/* Midfield */}
            <div className="flex justify-center gap-16">
              <PitchSlot id="LCM" player={lineup["LCM"]} />
              <PitchSlot id="RCM" player={lineup["RCM"]} />
            </div>
            <div className="flex justify-center">
              <PitchSlot id="CDM" player={lineup["CDM"]} />
            </div>
            {/* Defense */}
            <div className="flex justify-between px-2">
              <PitchSlot id="LB" player={lineup["LB"]} />
              <PitchSlot id="CB1" player={lineup["CB1"]} />
              <PitchSlot id="CB2" player={lineup["CB2"]} />
              <PitchSlot id="RB" player={lineup["RB"]} />
            </div>
            {/* GK */}
            <div className="flex justify-center">
              <PitchSlot id="GK" player={lineup["GK"]} />
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}