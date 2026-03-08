'use client';
import React, { useEffect, useState } from 'react';
import type { Toast, ToastType } from '@/src/context/ToastContext';

// Per-type config
const TOAST_CONFIG: Record<ToastType, { border: string; icon: string; label: string }> = {
  success: { border: '#00FF85', icon: '✓', label: 'Success' },
  error:   { border: '#FF2D55', icon: '✕', label: 'Error' },
  warning: { border: '#FFD23F', icon: '!', label: 'Warning' },
  info:    { border: '#00D1FF', icon: 'i', label: 'Info' },
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TOAST_CONFIG[toast.type];

  // Slide-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Fade out then remove
  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 280);
  };

  // Auto-dismiss animation trigger (fires ~200ms before context removes it)
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 3800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={handleDismiss}
      className="cursor-pointer select-none"
      style={{
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.95)',
        opacity: visible && !leaving ? 1 : 0,
      }}
    >
      <div
        className="flex items-start gap-3 px-4 py-3.5"
        style={{
          background: 'rgba(6,10,6,0.95)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderLeft: `3px solid ${cfg.border}`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          minWidth: '260px',
          maxWidth: '360px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 16px color-mix(in srgb, ${cfg.border} 12%, transparent)`,
        }}
      >
        {/* Icon badge */}
        <div
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center font-mono text-[11px] font-bold mt-0.5"
          style={{
            background: `color-mix(in srgb, ${cfg.border} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${cfg.border} 30%, transparent)`,
            color: cfg.border,
            borderRadius: '50%',
          }}
        >
          {cfg.icon}
        </div>

        {/* Message */}
        <p className="flex-1 font-sans text-[13px] leading-snug" style={{ color: 'rgba(255,255,255,0.88)' }}>
          {toast.message}
        </p>

        {/* Close */}
        <button
          onClick={e => { e.stopPropagation(); handleDismiss(); }}
          className="flex-shrink-0 font-mono text-[10px] transition-colors mt-0.5"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Progress bar — drains over 4 seconds */}
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', marginTop: '-1px' }}>
        <div
          style={{
            height: '100%',
            background: cfg.border,
            opacity: 0.5,
            transformOrigin: 'left',
            animation: 'toastDrain 4s linear forwards',
          }}
        />
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <>
      <style>{`
        @keyframes toastDrain {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      {/* Desktop: bottom-right */}
      <div
        className="fixed z-[9998] flex flex-col gap-2 pointer-events-none hidden sm:flex"
        style={{ bottom: '24px', right: '24px' }}
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </div>

      {/* Mobile: bottom-center, full width minus padding */}
      <div
        className="fixed z-[9998] flex flex-col gap-2 pointer-events-none sm:hidden"
        style={{ bottom: '80px', left: '16px', right: '16px' }}
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <div
              style={{
                transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              <div
                className="flex items-start gap-3 px-4 py-3.5"
                style={{
                  background: 'rgba(6,10,6,0.95)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderLeft: `3px solid ${TOAST_CONFIG[t.type].border}`,
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center font-mono text-[11px] font-bold"
                  style={{
                    background: `color-mix(in srgb, ${TOAST_CONFIG[t.type].border} 15%, transparent)`,
                    color: TOAST_CONFIG[t.type].border,
                    borderRadius: '50%',
                  }}
                >
                  {TOAST_CONFIG[t.type].icon}
                </div>
                <p className="flex-1 font-sans text-[13px] leading-snug" style={{ color: 'rgba(255,255,255,0.88)' }}>
                  {t.message}
                </p>
                <button onClick={() => onDismiss(t.id)} className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
