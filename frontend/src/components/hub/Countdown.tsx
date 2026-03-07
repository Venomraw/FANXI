'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';

const WC_KICKOFF = new Date('2026-06-11T20:00:00Z');

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; }

function calc(): TimeLeft {
  const diff = Math.max(0, WC_KICKOFF.getTime() - Date.now());
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export default function Countdown() {
  const { primary } = useTheme();
  const [time, setTime] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { value: time.days,    label: 'Days'    },
    { value: time.hours,   label: 'Hours'   },
    { value: time.minutes, label: 'Minutes' },
    { value: time.seconds, label: 'Seconds' },
  ];

  return (
    <div className="w-full border theme-transition relative overflow-hidden step-card"
      style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 15%, transparent)` }}>

      {/* Top accent — reference: gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px theme-transition"
        style={{ background: `linear-gradient(90deg, transparent, ${primary}, transparent)` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b"
        style={{ borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}>
        {/* Haki live badge */}
        <div className="haki-badge theme-transition">
          <span className="haki-dot theme-transition" />
          World Cup 2026
        </div>
        <p className="font-mono" style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Jun 11 · World Cup 2026
        </p>
      </div>

      {/* Section label */}
      <div className="px-8 pt-6 pb-1">
        <p className="section-label theme-transition">⚡ Kickoff Countdown</p>
      </div>

      {/* Numbers — reference exact: border-right dividers */}
      <div className="countdown-display px-4 py-8">
        {units.map((u, i) => (
          <div key={u.label}
            className="countdown-block theme-transition"
            style={i === 0 ? { paddingLeft: '8px' } : i === 3 ? { paddingRight: '8px' } : {}}>
            <div className="countdown-num">
              {String(u.value).padStart(2, '0')}
            </div>
            <div className="countdown-unit">{u.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom scanline */}
      <div className="absolute bottom-0 left-0 right-0 h-px theme-transition"
        style={{ background: `linear-gradient(90deg, ${primary}20, transparent)` }} />
    </div>
  );
}
