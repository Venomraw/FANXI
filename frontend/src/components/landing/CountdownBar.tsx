'use client';

import { useEffect, useState } from 'react';

// World Cup 2026 kickoff: June 11 2026 19:00 UTC
const WC_KICKOFF = new Date('2026-06-11T19:00:00Z');

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const now = new Date();
  const diff = WC_KICKOFF.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function CountdownBar() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    // SSR placeholder — same height, no content flash
    return (
      <div
        style={{ height: '40px', background: 'var(--dark)', borderBottom: '1px solid rgba(220,38,38,0.3)' }}
        className="fixed top-0 left-0 right-0 z-50"
      />
    );
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-6 px-4"
      style={{
        height: '40px',
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(220,38,38,0.35)',
      }}
    >
      {/* Left label */}
      <span
        className="font-mono text-red-500 uppercase tracking-widest hidden sm:block"
        style={{ fontSize: '10px' }}
      >
        WC 2026
      </span>

      <div className="flex items-center gap-1">
        {/* Days */}
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-semibold text-white tabular-nums"
            style={{ fontSize: '15px', lineHeight: 1 }}
          >
            {timeLeft.days}
          </span>
          <span
            className="font-mono text-white/60 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px' }}
          >
            d
          </span>
        </div>

        <span className="text-white/30 font-mono mx-1" style={{ fontSize: '12px' }}>:</span>

        {/* Hours */}
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-semibold text-white tabular-nums"
            style={{ fontSize: '15px', lineHeight: 1 }}
          >
            {pad(timeLeft.hours)}
          </span>
          <span
            className="font-mono text-white/60 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px' }}
          >
            h
          </span>
        </div>

        <span className="text-white/30 font-mono mx-1" style={{ fontSize: '12px' }}>:</span>

        {/* Minutes */}
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-semibold text-white tabular-nums"
            style={{ fontSize: '15px', lineHeight: 1 }}
          >
            {pad(timeLeft.minutes)}
          </span>
          <span
            className="font-mono text-white/60 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px' }}
          >
            m
          </span>
        </div>

        <span className="text-white/30 font-mono mx-1" style={{ fontSize: '12px' }}>:</span>

        {/* Seconds */}
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-semibold text-red-400 tabular-nums"
            style={{ fontSize: '15px', lineHeight: 1 }}
          >
            {pad(timeLeft.seconds)}
          </span>
          <span
            className="font-mono text-white/60 uppercase"
            style={{ fontSize: '9px', letterSpacing: '1px' }}
          >
            s
          </span>
        </div>
      </div>

      <span
        className="font-mono text-white/60 uppercase tracking-widest hidden sm:block"
        style={{ fontSize: '10px' }}
      >
        until kickoff
      </span>
    </div>
  );
}
