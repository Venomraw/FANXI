'use client';
import React, { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import PitchSlot from './PitchSlot';
import DraggablePlayer from './DraggablePlayer';

// 1. Updated Interface: No more 'image' requirement
interface Player {
  name: string;
  number: number;
}

export default function PitchBoard() {
  // --- SQUAD STATE (The Bench) ---
  const [squad, setSquad] = useState<Player[]>([
    { name: "L. Messi", number: 10 },
    { name: "C. Ronaldo", number: 7 },
    { name: "K. Mbappe", number: 10 },
    { name: "E. Haaland", number: 9 },
    { name: "V. van Dijk", number: 4 },
    { name: "Pedri", number: 8 },
    { name: "R. Araujo", number: 4 },
    { name: "J. Kounde", number: 23 },
    { name: "Ter Stegen", number: 1 },
  ]);

  // --- LINEUP STATE (The Pitch) ---
  const [lineup, setLineup] = useState<Record<string, Player>>({});

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;

    if (over && active) {
      const playerName = active.id as string;
      const slotId = over.id as string;

      // Find the player being dragged
      const newPlayerObj = squad.find(p => p.name === playerName);

      if (newPlayerObj) {
        // DISPLACEMENT LOGIC: Check if someone is already in that slot
        const displacedPlayer = lineup[slotId];

        // Update the pitch
        setLineup((prev) => ({ ...prev, [slotId]: newPlayerObj }));

        // Update the bench
        setSquad((prev) => {
          // Remove the player who moved to the pitch
          let updatedSquad = prev.filter((p) => p.name !== playerName);

          // If a player was replaced, add them back to the bench array
          if (displacedPlayer) {
            updatedSquad = [...updatedSquad, displacedPlayer];
          }

          return updatedSquad;
        });
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-zinc-950 rounded-3xl border border-zinc-800">
      <DndContext onDragEnd={handleDragEnd}>
        
        {/* --- SQUAD BENCH --- */}
        <div className="w-full lg:w-64 bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
          <h3 className="text-xs font-black text-zinc-500 mb-6 uppercase tracking-widest text-center">
            Squad Bench
          </h3>
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
            {squad.map((player) => (
              <DraggablePlayer 
                key={player.name} 
                name={player.name} 
                number={player.number} // Passing number to fix the TS error
              />
            ))}
          </div>
        </div>

        {/* --- TACTICAL PITCH --- */}
        <div className="relative w-full max-w-[450px] aspect-[2/3] bg-gradient-to-b from-emerald-900 to-zinc-950 rounded-2xl border-4 border-white/5 overflow-hidden p-6 mx-auto">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10" />
          
          <div className="relative h-full flex flex-col justify-between">
            {/* Forwards */}
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

            {/* Goalkeeper */}
            <div className="flex justify-center">
              <PitchSlot id="GK" player={lineup["GK"]} />
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}