'use client';
import { useState } from 'react';
import ShareModal from './ShareModal';

interface ShareCardButtonProps {
  type: 'prediction' | 'profile';
  matchId?: number;
  username?: string;
  matchLabel?: string;
  /** Visual size variant */
  size?: 'sm' | 'md';
  /** Icon-only mode for tight spaces (hub prediction list) */
  iconOnly?: boolean;
}

export default function ShareCardButton({
  type,
  matchId,
  username,
  matchLabel,
  size = 'md',
  iconOnly = false,
}: ShareCardButtonProps) {
  const [open, setOpen] = useState(false);

  const label = type === 'prediction' ? 'Share My Prediction' : 'Share Profile';

  const padY = size === 'sm' ? '8px'  : '12px';
  const padX = size === 'sm' ? '14px' : '22px';
  const fs   = size === 'sm' ? '12px' : '14px';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={label}
        className="flex items-center gap-2 font-sans font-semibold rounded-lg transition-all duration-200"
        style={{
          background: 'rgba(255,45,85,0.1)',
          border: '1px solid rgba(255,45,85,0.22)',
          color: 'var(--red)',
          fontSize: fs,
          padding: iconOnly ? '8px 10px' : `${padY} ${padX}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.2)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(255,45,85,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <span style={{ fontSize: iconOnly ? '16px' : '15px' }}>📤</span>
        {!iconOnly && label}
      </button>

      {open && (
        <ShareModal
          type={type}
          matchId={matchId}
          username={username}
          matchLabel={matchLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
