'use client';
import { useDroppable } from '@dnd-kit/core';
import DraggablePlayer from './DraggablePlayer'; // CRITICAL IMPORT

interface PitchSlotProps {
  id: string;
  player: { name: string; number: number } | null;
}

export default function PitchSlot({ id, player }: PitchSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-20 h-24 flex flex-col items-center justify-center transition-all ${
        isOver ? 'scale-110 bg-white/5 rounded-full' : ''
      }`}
    >
      {player ? (
        /* We wrap the player in DraggablePlayer so they can be 
          picked up again once they are on the pitch.
        */
        <DraggablePlayer 
          id={player.name} // We use the name as the draggable ID
          name={player.name} 
          number={player.number} 
        />
      ) : (
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
           <span className="text-[9px] text-white/30 font-bold">{id}</span>
        </div>
      )}
    </div>
  );
}
