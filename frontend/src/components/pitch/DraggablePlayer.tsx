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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isDragging ? `color-mix(in srgb, ${primary} 12%, var(--dark))` : 'var(--dark)',
        borderColor: isDragging ? primary : `color-mix(in srgb, ${primary} 20%, transparent)`,
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      {...listeners}
      {...attributes}
      className="p-2.5 border transition-colors w-full flex items-center justify-between theme-transition"
      onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
      onMouseLeave={e => {
        if (!isDragging)
          e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 20%, transparent)`;
      }}>
      <div className="flex items-center gap-2.5">
        {/* Jersey number */}
        <div className="w-7 h-8 flex items-center justify-center flex-shrink-0 theme-transition"
          style={{
            background: `color-mix(in srgb, ${primary} 20%, transparent)`,
            borderLeft: `2px solid ${primary}`,
          }}>
          <span className="font-display text-base leading-none theme-transition" style={{ color: primary }}>
            {number || '—'}
          </span>
        </div>
        <span className="text-[var(--text)] text-sm font-semibold truncate max-w-[120px]">{name}</span>
      </div>
      {/* Drag handle hint */}
      <span className="text-[10px] ml-1 flex-shrink-0" style={{ color: 'var(--muted)' }}>⠿</span>
    </div>
  );
}
