'use client';
import { useDroppable } from '@dnd-kit/core';
import DraggablePlayer from './DraggablePlayer';
import { useTheme } from '@/src/context/ThemeContext';

interface PitchSlotProps {
  id: string;
  player: { name: string; number: number } | undefined;
}

export default function PitchSlot({ id, player }: PitchSlotProps) {
  const { primary } = useTheme();
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="w-20 h-24 flex flex-col items-center justify-center transition-all"
      style={isOver ? { transform: 'scale(1.1)', backgroundColor: `${primary}15`, borderRadius: '50%' } : {}}
    >
      {player ? (
        <DraggablePlayer id={player.name} name={player.name} number={player.number} />
      ) : (
        <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center"
          style={{ borderColor: `${primary}40` }}>
          <span className="text-[9px] font-bold" style={{ color: `${primary}60` }}>{id}</span>
        </div>
      )}
    </div>
  );
}
