'use client';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggablePlayerProps {
  id: string;      // Add this line!
  name: string;
  number: number;
}

export default function DraggablePlayer({ id, name, number }: DraggablePlayerProps) {
  // Use the 'id' passed from the parent (PitchSlot or Bench)
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id, 
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-green-500 transition-all shadow-lg flex items-center justify-between w-full"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-10 bg-green-600 rounded flex items-center justify-center border border-white/20">
          <span className="text-white font-bold text-xs">{number}</span>
        </div>
        <span className="text-white font-medium text-sm">{name}</span>
      </div>
    </div>
  );
}