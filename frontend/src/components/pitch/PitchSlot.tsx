'use client';
import { useDroppable } from '@dnd-kit/core';

interface PitchSlotProps {
  id: string;      // e.g., "GK", "ST"
  player: string | null;
}

export default function PitchSlot({ id, player }: PitchSlotProps) {
  // This hook makes this specific div a valid "drop zone"
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
        isOver ? 'border-green-400 bg-green-900/20 scale-110' : 'border-zinc-700 bg-black/20'
      }`}
    >
      {player ? (
        <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold animate-in zoom-in">
          {player.split(' ')[0]}
        </div>
      ) : (
        <span className="text-[10px] text-zinc-500 font-mono">{id}</span>
      )}
    </div>
  );
}