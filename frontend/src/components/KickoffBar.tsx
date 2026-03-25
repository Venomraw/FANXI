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
      className="w-full z-[60]"
      style={{
        background: 'rgba(6,10,6,0.98)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid color-mix(in srgb, var(--team-primary) 20%, transparent)',
        height: '44px',
      }}
    >
      <div
        className="h-full mx-auto flex items-center justify-between"
        style={{ maxWidth: '1400px', padding: '0 32px' }}
      >
        {/* ── LEFT — Event label ── */}
        <div className="hidden sm:flex items-center gap-3">
          <span style={{ fontSize: '13px' }}>⚽</span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--muted)' }}
          >
            FIFA World Cup 2026
          </span>
          <div className="w-px h-3" style={{ background: 'var(--border)' }} />
        </div>

        {/* ── CENTER — Countdown ── */}
        {ready ? (
          <div className="flex items-center" style={{ gap: '10px' }}>
            {[
              { v: days,    l: 'd', highlight: false },
              { v: hours,   l: 'h', highlight: false },
              { v: minutes, l: 'm', highlight: false },
              { v: seconds, l: 's', highlight: true  },
            ].map(({ v, l, highlight }, i) => (
              <div key={l} className="flex items-center" style={{ gap: '10px' }}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  <span
                    className="font-display font-semibold tabular-nums"
                    style={{ fontSize: '15px', color: highlight ? 'var(--team-primary)' : 'var(--text)' }}
                  >
                    {String(v).padStart(2, '0')}
                  </span>
                  <span
                    className="font-mono"
                    style={{ fontSize: '10px', color: 'var(--text)', opacity: 0.5 }}
                  >
                    {l}
                  </span>
                </span>
                {i < 3 && (
                  <span className="font-mono" style={{ fontSize: '12px', color: 'var(--muted)', opacity: 0.4 }}>·</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="font-mono text-xs tracking-widest" style={{ color: 'var(--muted)' }}>
            SYNCING...
          </span>
        )}

        {/* ── RIGHT — Host nations ── */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-px h-3" style={{ background: 'var(--border)' }} />
          <span
            className="font-mono uppercase"
            style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--muted)' }}
          >
            🇺🇸 USA · 🇨🇦 Canada · 🇲🇽 Mexico
          </span>
        </div>
      </div>
    </div>
  );
}
