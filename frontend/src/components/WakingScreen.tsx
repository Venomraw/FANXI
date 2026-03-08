'use client';
import React, { useEffect, useState } from 'react';
import type { BackendStatus } from '@/src/hooks/useBackendReady';

interface Props {
  status: BackendStatus;
  elapsed: number;
  onRetry: () => void;
}

export default function WakingScreen({ status, elapsed, onRetry }: Props) {
  const [dots, setDots] = useState('');

  // Animate ellipsis
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, []);

  // Progress bar fills over 30 seconds, capped at 98% until ready
  const progress = Math.min((elapsed / 30) * 100, 98);

  const subMessage =
    elapsed >= 25 ? 'Nearly ready — this only happens once...' :
    elapsed >= 10 ? 'Almost there — warming up the engines...' :
    null;

  return (
    <>
      <style>{`
        @keyframes wakeFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes wakePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
      `}</style>

      {/* Full-screen overlay — dark tint, stadium shows behind */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: 'rgba(6,10,6,0.82)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      >
        {/* Glass card */}
        <div
          className="flex flex-col items-center gap-6 px-10 py-10 text-center"
          style={{
            background: 'rgba(0,0,0,0.68)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            minWidth: '320px',
            maxWidth: '420px',
            width: '90vw',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="font-display font-semibold tracking-widest"
              style={{ fontSize: '22px', color: '#FFD23F', letterSpacing: '2px' }}
            >
              FAN
            </span>
            <span
              className="font-display font-semibold tracking-widest"
              style={{ fontSize: '22px', color: '#00FF85', letterSpacing: '2px' }}
            >
              XI
            </span>
          </div>

          {/* Animated ball */}
          <div
            style={{
              fontSize: '52px',
              lineHeight: 1,
              animation: status !== 'timeout' ? 'wakeFloat 1.8s ease-in-out infinite' : 'none',
            }}
          >
            ⚽
          </div>

          {/* Status text */}
          {status === 'timeout' ? (
            <div className="flex flex-col items-center gap-4">
              <p
                className="font-sans text-[14px] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                Taking longer than usual.
                <br />
                The server may be starting up.
              </p>
              <button
                onClick={onRetry}
                className="font-display font-semibold px-8 py-3 uppercase tracking-widest transition-all hover:-translate-y-0.5"
                style={{
                  fontSize: '13px',
                  background: '#FFD23F',
                  color: '#060A06',
                  boxShadow: '0 0 20px rgba(255,210,63,0.35)',
                }}
              >
                Retry Connection
              </button>
              <button
                onClick={() => window.location.reload()}
                className="font-mono text-[10px] uppercase tracking-widest transition-all"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              >
                Reload page
              </button>
            </div>
          ) : (
            <>
              <div>
                <p
                  className="font-display font-semibold text-[16px] tracking-wide"
                  style={{ color: 'rgba(255,255,255,0.88)' }}
                >
                  Connecting to servers{dots}
                </p>
                {subMessage && (
                  <p
                    className="font-sans text-[12px] mt-2"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                  >
                    {subMessage}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div
                className="w-full overflow-hidden"
                style={{
                  height: '3px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '2px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #FFD23F, #00FF85)',
                    borderRadius: '2px',
                    transition: 'width 1s linear',
                    animation: elapsed === 0 ? 'progressFill 0.5s ease' : undefined,
                    boxShadow: '0 0 8px rgba(255,210,63,0.5)',
                  }}
                />
              </div>

              {/* Elapsed */}
              <p
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                {elapsed}s — Render free tier wakes in ~30s
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
