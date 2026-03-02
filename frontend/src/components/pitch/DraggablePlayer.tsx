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
        background: isDragging ? `color-mix(in srgb, ${primary} 15%, var(--dark3))` : 'var(--dark3)',
        borderColor: isDragging ? primary : 'var(--border)',
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      {...listeners}
      {...attributes}
      className="px-2.5 py-3 border transition-colors w-full flex items-center justify-between theme-transition"
      onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
      onMouseLeave={e => {
        if (!isDragging)
          e.currentTarget.style.borderColor = 'var(--border)';
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
        <span className="text-[var(--text)] text-[13px] font-medium leading-relaxed truncate max-w-[120px]">{name}</span>
      </div>
      {/* Drag handle hint */}
      <span className="text-[10px] ml-1 flex-shrink-0" style={{ color: 'var(--muted)' }}>⠿</span>
    </div>
  );
}
