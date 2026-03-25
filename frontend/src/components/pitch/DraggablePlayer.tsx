'use client';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTheme } from '@/src/context/ThemeContext';

interface DraggablePlayerProps {
  id: string;
  name: string;
  number: number;
  variant?: 'bench' | 'pitch';
}

/** Extract surname (last word) for jersey label */
function surname(name: string): string {
  const parts = name.trim().split(' ');
  const last = parts[parts.length - 1];
  return last.length > 8 ? last.slice(0, 7) + '…' : last;
}

export default function DraggablePlayer({ id, name, number, variant = 'bench' }: DraggablePlayerProps) {
  const { primary } = useTheme();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  /* ── PITCH VARIANT: jersey SVG + surname ─────────────────────────── */
  if (variant === 'pitch') {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, opacity: isDragging ? 0.7 : 1 }}
        {...listeners}
        {...attributes}
        className={`flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none ${isDragging ? 'z-50' : 'z-auto'}`}
      >
        {/* Jersey SVG */}
        <div
          style={{
            filter: isDragging
              ? `drop-shadow(0 0 10px ${primary})`
              : `drop-shadow(0 0 6px color-mix(in srgb, ${primary} 55%, transparent))`,
            transition: 'filter 0.2s ease',
          }}
        >
          <svg viewBox="0 0 50 56" style={{ width: 'clamp(30px, 3.5vw, 42px)', height: 'auto' }} xmlns="http://www.w3.org/2000/svg">
            {/* Jersey body */}
            <path
              d="M12,2 C18,10 32,10 38,2 L50,16 L38,20 L38,56 L12,56 L12,20 L0,16 Z"
              fill={primary}
            />
            {/* Subtle collar shadow */}
            <path
              d="M12,2 C18,10 32,10 38,2"
              fill="none"
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="1.5"
            />
            {/* Sleeve highlight */}
            <path
              d="M12,20 L0,16 L12,2"
              fill="rgba(255,255,255,0.08)"
            />
            <path
              d="M38,20 L50,16 L38,2"
              fill="rgba(0,0,0,0.1)"
            />
            {/* Jersey number */}
            <text
              x="25"
              y="42"
              textAnchor="middle"
              fontFamily="'Space Grotesk', sans-serif"
              fontWeight="700"
              fontSize={number >= 10 ? '18' : '20'}
              fill="rgba(0,0,0,0.75)"
            >
              {number || '?'}
            </text>
          </svg>
        </div>

        {/* Surname label */}
        <span
          className="font-mono uppercase text-center leading-none"
          style={{
            fontSize: '8px',
            letterSpacing: '0.8px',
            color: 'rgba(255,255,255,0.75)',
            maxWidth: '52px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {surname(name)}
        </span>
      </div>
    );
  }

  /* ── BENCH VARIANT: horizontal list row ──────────────────────────── */
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isDragging ? `color-mix(in srgb, ${primary} 15%, var(--dark3))` : 'var(--dark3)',
        borderColor: isDragging ? primary : 'var(--border)',
        opacity: isDragging ? 0.85 : 1,
      }}
      {...listeners}
      {...attributes}
      className={`px-2.5 py-3 border transition-colors w-full flex items-center justify-between theme-transition ${isDragging ? 'z-50' : 'z-auto'}`}
      onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
      onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="flex items-center gap-2.5">
        {/* Jersey number chip */}
        <div
          className="w-7 h-8 flex items-center justify-center flex-shrink-0 theme-transition"
          style={{
            background: `color-mix(in srgb, ${primary} 20%, transparent)`,
            borderLeft: `2px solid ${primary}`,
          }}
        >
          <span className="font-display text-base leading-none theme-transition" style={{ color: primary }}>
            {number || '—'}
          </span>
        </div>
        <span className="text-[var(--text)] text-[13px] font-medium leading-relaxed truncate max-w-[120px]">{name}</span>
      </div>
      <span className="text-xs ml-1 flex-shrink-0" style={{ color: 'var(--muted)' }}>⠿</span>
    </div>
  );
}
