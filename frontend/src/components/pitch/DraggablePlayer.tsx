'use client';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTheme } from '@/src/context/ThemeContext';

interface DraggablePlayerProps {
  id: string;
  name: string;
  number: number;
}

export default function DraggablePlayer({ id, name, number }: DraggablePlayerProps) {
  const { primary } = useTheme();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-lg flex items-center justify-between w-full"
      onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-10 rounded flex items-center justify-center border border-white/20"
          style={{ backgroundColor: primary }}>
          <span className="text-white font-bold text-xs">{number}</span>
        </div>
        <span className="text-white font-medium text-sm">{name}</span>
      </div>
    </div>
  );
}
