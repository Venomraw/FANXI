'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const WC_KICKOFF = new Date('2026-06-11T19:00:00Z');

function getDaysLeft(): number {
  const diff = WC_KICKOFF.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function UrgencyCountdown() {
  const [days, setDays] = useState<number>(getDaysLeft());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDays(getDaysLeft());
  }, []);

  return (
    <>
      <h2
        className="font-sans text-white font-bold mb-6"
        style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
      >
        World Cup 2026 starts in
        <br />
        <span className="text-red-600">
          {mounted ? days : '---'} days.
        </span>
      </h2>
      <p
        className="font-display text-white/60 mb-10"
        style={{ fontSize: '18px', lineHeight: 1.7 }}
      >
        Make your first prediction now.
      </p>
      <Link
        href="/predict"
        className="inline-flex items-center gap-3 font-display font-semibold text-white rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: 'var(--red)',
          padding: '20px 40px',
          fontSize: '20px',
          boxShadow: '0 8px 32px rgba(220,38,38,0.3)',
        }}
      >
        ⚽ Join Free — It Takes 2 Minutes
      </Link>
    </>
  );
}
