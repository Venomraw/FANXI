'use client';
import { useEffect, useState } from 'react';

const WC_KICKOFF = new Date('2026-06-11T20:00:00Z');

function useCountdown() {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: false });
  useEffect(() => {
    const tick = () => {
      const diff = WC_KICKOFF.getTime() - Date.now();
      if (diff <= 0) {
        setT({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: true });
        return;
      }
      setT({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000)  / 60_000),
        seconds: Math.floor((diff % 60_000)      / 1_000),
        ready:   true,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function KickoffBar() {
  const { days, hours, minutes, seconds, ready } = useCountdown();

  return (
    <div
      className="w-full z-[60] flex items-center justify-center gap-6 py-2 px-4 border-b"
      style={{
        background: 'var(--dark3)',
        borderColor: 'var(--border)',
        minHeight: '36px',
      }}
    >
      {/* Live dot */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="haki-dot" style={{ width: '5px', height: '5px' }} />
        <span
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: 'var(--muted)' }}
        >
          WC 2026 Kickoff
        </span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-3 w-px" style={{ background: 'var(--border)' }} />

      {/* Countdown units */}
      {ready ? (
        <div className="flex items-center gap-4">
          {[
            { v: days,    l: 'D' },
            { v: hours,   l: 'H' },
            { v: minutes, l: 'M' },
            { v: seconds, l: 'S' },
          ].map(({ v, l }, i) => (
            <div key={l} className="flex items-center gap-4">
              <div className="flex items-baseline gap-1">
                <span
                  className="font-display font-semibold tabular-nums"
                  style={{ fontSize: '15px', lineHeight: '1', color: 'var(--text)' }}
                >
                  {String(v).padStart(2, '0')}
                </span>
                <span
                  className="font-mono text-[9px] tracking-widest uppercase"
                  style={{ color: 'var(--muted)' }}
                >
                  {l}
                </span>
              </div>
              {i < 3 && (
                <span
                  className="font-mono text-[11px]"
                  style={{ color: 'var(--border)', animation: 'colonBlink 1s step-start infinite' }}
                >
                  :
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <span className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--muted)' }}>
          SYNCING...
        </span>
      )}

      {/* Divider */}
      <div className="hidden sm:block h-3 w-px" style={{ background: 'var(--border)' }} />

      {/* Event label */}
      <span
        className="hidden sm:block font-mono text-[10px] tracking-widest uppercase"
        style={{ color: 'var(--muted)' }}
      >
        Jun 11 → Jul 19 · Dallas, TX
      </span>
    </div>
  );
}
