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

  // Outer slot style — glow when filled, highlight when dragging over
  const slotStyle = isOver
    ? {
        transform: 'scale(1.08)',
        background: `color-mix(in srgb, ${primary} 15%, transparent)`,
        boxShadow: `0 0 20px color-mix(in srgb, ${primary} 45%, transparent)`,
      }
    : player
      ? { boxShadow: '0 0 16px rgba(0, 232, 124, 0.35)' }
      : {};

  return (
    <div
      ref={setNodeRef}
      className="w-10 lg:w-12 xl:w-14 flex flex-col items-center justify-center theme-transition"
      style={slotStyle}>
      {player ? (
        <div className="w-full">
          <DraggablePlayer id={player.name} name={player.name} number={player.number} variant="pitch" />
        </div>
      ) : (
        <div
          className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center theme-transition"
          style={{
            borderColor: isOver ? primary : `color-mix(in srgb, ${primary} 35%, transparent)`,
            background:  isOver
              ? `color-mix(in srgb, ${primary} 10%, transparent)`
              : 'var(--slot-empty)',
          }}>
          <span
            className="font-mono text-[9px] uppercase theme-transition"
            style={{
              letterSpacing: '0.2em',
              color: isOver ? primary : `color-mix(in srgb, ${primary} 55%, transparent)`,
            }}>
            {id}
          </span>
        </div>
      )}
    </div>
  );
}
