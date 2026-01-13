'use client';
import { useDroppable } from '@dnd-kit/core';

interface PitchSlotProps {
  id: string;
  player: { name: string; number: number } | null; // Use number, remove image
}

export default function PitchSlot({ id, player }: PitchSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-20 h-24 flex flex-col items-center justify-center transition-all ${
        isOver ? 'scale-110' : ''
      }`}
    >
      {player ? (
        <div className="flex flex-col items-center animate-in fade-in zoom-in">
          {/* THE JERSEY ICON */}
          <div className="relative w-12 h-14 bg-green-600 rounded-t-lg border-x-4 border-t-4 border-white flex items-center justify-center shadow-lg">
            <div className="absolute -left-3 top-0 w-4 h-6 bg-green-600 rounded-l-md border-y-2 border-l-2 border-white" />
            <div className="absolute -right-3 top-0 w-4 h-6 bg-green-600 rounded-r-md border-y-2 border-r-2 border-white" />
            <span className="text-white font-black text-lg">{player.number}</span>
          </div>
          <span className="text-[10px] font-bold mt-2 bg-black/80 px-2 py-0.5 rounded text-white uppercase truncate max-w-[80px]">
            {player.name.split(' ').pop()}
          </span>
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
           <span className="text-[9px] text-white/30 font-bold">{id}</span>
        </div>
      )}
    </div>
  );
}