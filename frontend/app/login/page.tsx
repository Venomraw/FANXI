'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

// World Cup 2026 opening match — Jun 11, 2026 20:00 UTC
const WC_KICKOFF = new Date('2026-06-11T20:00:00Z');

function useCountdown() {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: false });
  useEffect(() => {
    const tick = () => {
      const diff = WC_KICKOFF.getTime() - Date.now();
      if (diff <= 0) { setT({ days: 0, hours: 0, minutes: 0, seconds: 0, ready: true }); return; }
      setT({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000)  / 60_000),
        seconds: Math.floor((diff % 60_000)     / 1_000),
        ready:   true,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// Ticker content — same style as reference
const TICKER_TEXT = '⚽ WORLD CUP 2026 — JUNE 11 → JULY 19 \u00a0·\u00a0 🏟️ 16 VENUES ACROSS USA, CANADA & MEXICO \u00a0·\u00a0 ⚡ FANXI TACTICAL PREDICTIONS \u00a0·\u00a0 🧠 SET YOUR TACTICAL HAKI \u00a0·\u00a0 🎯 48 NATIONS · 104 MATCHES \u00a0·\u00a0 🏆 BUILD YOUR DREAM SQUAD NOW \u00a0·\u00a0 💥 LOCK YOUR XI BEFORE KICKOFF \u00a0·\u00a0';

export default function LoginPage() {
  const { login } = useAuth();
  const { primary, team } = useTheme();
  const router = useRouter();
  const countdown = useCountdown();

  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail]       = useState('');
  const [country, setCountry]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  function extractError(detail: unknown, fallback: string): string {
    if (Array.isArray(detail)) return detail.map((e: { msg?: string }) => e.msg).join(', ');
    if (typeof detail === 'string') return detail;
    return fallback;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const err = await login(username, password);
      if (err) { setError(err); setLoading(false); }
      else router.push('/');
    } catch {
      setError('Connection error — is the server running?');
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, country_allegiance: country }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(extractError(data.detail, 'Registration failed'));
        setLoading(false);
        return;
      }
      const err = await login(username, password);
      if (err) { setError(err); setLoading(false); }
      else router.push('/');
    } catch {
      setError('Connection error — is the server running?');
      setLoading(false);
    }
  }

  // Dynamic border colour based on team primary
  const borderPrimary = `color-mix(in srgb, ${primary} 18%, transparent)`;
  const borderSubtle  = `color-mix(in srgb, ${primary} 10%, transparent)`;

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden" style={{ color: 'var(--text)' }}>

      {/* Animated grid bg — reference exact */}
      <div className="grid-bg-primary opacity-100" />

      {/* Gold orb — reference exact */}
      <div className="absolute pointer-events-none"
        style={{
          right: '-80px', top: '15%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(255,210,63,0.05), transparent 70%)',
          borderRadius: '50%', animation: 'orbPulse 8s ease-in-out infinite',
        }} />

      {/* Primary orb */}
      <div className="absolute pointer-events-none theme-transition"
        style={{
          left: '20%', bottom: '10%', width: '400px', height: '400px',
          background: `radial-gradient(circle, color-mix(in srgb, ${primary} 6%, transparent), transparent 70%)`,
          borderRadius: '50%', animation: 'orbPulse 11s ease-in-out infinite reverse',
        }} />

      {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-1/2 relative border-r overflow-hidden"
        style={{ borderColor: borderSubtle }}>

        {/* Scanline sweep */}
        <div className="absolute left-0 right-0 h-px pointer-events-none z-10 theme-transition"
          style={{
            background: `linear-gradient(90deg, transparent, ${primary}25, transparent)`,
            animation: 'scanline 6s linear infinite',
          }} />

        {/* HEADER — Logo + haki badge */}
        <div className="px-14 pt-14 pb-8 fade-up-1">
          {/* Haki live badge */}
          <div className="haki-badge theme-transition mb-6">
            <span className="haki-dot theme-transition" />
            Matchday Haki — System Live
          </div>

          {/* Hero logo */}
          <h1 className="font-display leading-none theme-transition"
            style={{ fontSize: 'clamp(80px, 12vw, 160px)', color: primary, letterSpacing: '-1px' }}>
            Fan<span style={{ color: 'var(--gold)' }}>XI</span>
          </h1>
          <p className="font-mono mt-3"
            style={{ fontSize: '11px', letterSpacing: '4px', color: 'var(--muted)', textTransform: 'uppercase' }}>
            World Cup 2026 · Tactical Hub
          </p>
        </div>

        {/* TICKER STRIP — reference exact */}
        <div className="overflow-hidden py-2.5 theme-transition fade-up-2"
          style={{ background: primary, color: '#000', flexShrink: 0 }}>
          <div className="ticker-inner" style={{ color: '#000' }}>
            {TICKER_TEXT}{TICKER_TEXT}
          </div>
        </div>

        {/* COUNTDOWN SECTION — reference exact layout */}
        <div className="px-14 py-10 flex-1 flex flex-col justify-center fade-up-3">

          {/* Section label — reference: 10px, 4px letter-spacing, primary */}
          <p className="section-label theme-transition mb-6">
            ⚡ Until World Cup Kickoff
          </p>

          {/* Big number blocks with border-right dividers — reference countdown exact */}
          <div className="countdown-display mb-3">
            {countdown.ready ? (
              <>
                {[
                  { v: countdown.days,    l: 'Days'    },
                  { v: countdown.hours,   l: 'Hours'   },
                  { v: countdown.minutes, l: 'Minutes' },
                  { v: countdown.seconds, l: 'Seconds' },
                ].map((unit, i) => (
                  <div key={unit.l}
                    className="countdown-block theme-transition"
                    style={i === 0 ? { paddingLeft: 0 } : i === 3 ? { paddingRight: 0 } : {}}>
                    <div className="countdown-num theme-transition"
                      style={{ textShadow: `0 0 60px color-mix(in srgb, ${primary} 20%, transparent)` }}>
                      {String(unit.v).padStart(2, '0')}
                    </div>
                    <div className="countdown-unit">
                      {unit.l}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '3px' }}>
                SYNCING...
              </div>
            )}
          </div>

          {/* Date line */}
          <p className="font-mono mt-4"
            style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Jun 11 → Jul 19, 2026 · Dallas, Texas
          </p>

          {/* Divider */}
          <div className="my-8 h-px theme-transition"
            style={{ background: `linear-gradient(90deg, ${primary}30, transparent)` }} />

          {/* Stats row — reference: Bebas Neue numbers + 9px mono labels */}
          <div className="flex gap-10 fade-up-4">
            {[
              { num: '48',  label: 'Nations'  },
              { num: '16',  label: 'Venues'   },
              { num: '104', label: 'Matches'  },
              { num: '2.4K', label: 'Scouts'  },
            ].map(s => (
              <div key={s.label}>
                <div className="font-display leading-none theme-transition"
                  style={{ fontSize: '2.8rem', color: primary }}>
                  {s.num}
                </div>
                <div className="label-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-14 pb-10 fade-up-5">
          <p className="font-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase' }}>
            Matchday Haki Connection · Secured
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative z-10">

        {/* Mobile: logo + compact countdown */}
        <div className="lg:hidden w-full max-w-sm mb-8">
          {/* Mobile haki badge */}
          <div className="haki-badge theme-transition mb-5 mx-auto w-fit">
            <span className="haki-dot theme-transition" />
            System Live
          </div>

          <div className="text-center mb-6">
            <h1 className="font-display leading-none theme-transition" style={{ fontSize: '5rem', color: primary }}>
              Fan<span style={{ color: 'var(--gold)' }}>XI</span>
            </h1>
            <p className="font-mono mt-2" style={{ fontSize: '10px', letterSpacing: '4px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              World Cup 2026 Tactical Hub
            </p>
          </div>

          {/* Mobile ticker */}
          <div className="overflow-hidden py-2 mb-6 theme-transition" style={{ background: primary }}>
            <div className="ticker-inner" style={{ color: '#000', fontSize: '9px', letterSpacing: '2px' }}>
              {TICKER_TEXT}{TICKER_TEXT}
            </div>
          </div>

          {/* Mobile countdown — compact reference style */}
          {countdown.ready && (
            <div className="relative border overflow-hidden mb-2 theme-transition"
              style={{ borderColor: borderPrimary, background: `color-mix(in srgb, ${primary} 4%, transparent)` }}>
              <div className="absolute top-0 left-0 right-0 h-px theme-transition"
                style={{ background: `linear-gradient(90deg, transparent, ${primary}, transparent)` }} />
              <div className="countdown-display py-5">
                {[
                  { v: countdown.days,    l: 'D' },
                  { v: countdown.hours,   l: 'H' },
                  { v: countdown.minutes, l: 'M' },
                  { v: countdown.seconds, l: 'S' },
                ].map((unit, i) => (
                  <div key={unit.l}
                    className="countdown-block theme-transition"
                    style={{
                      padding: '0 20px',
                      borderRightColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
                      ...(i === 0 ? { paddingLeft: 0 } : {}),
                      ...(i === 3 ? { paddingRight: 0, borderRight: 'none' } : {}),
                    }}>
                    <div className="countdown-num" style={{ fontSize: 'clamp(36px,10vw,52px)' }}>
                      {String(unit.v).padStart(2, '0')}
                    </div>
                    <div className="countdown-unit">{unit.l}</div>
                  </div>
                ))}
              </div>
              <p className="text-center pb-3 font-mono"
                style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Until Kickoff
              </p>
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm fade-up-2">

          {/* Mode toggle — reference .ps-btn style */}
          <div className="flex mb-8 border theme-transition"
            style={{ borderColor: borderPrimary }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-3 font-mono transition-all theme-transition"
                style={{
                  fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
                  ...(mode === m
                    ? { background: primary, color: '#000', fontWeight: 700 }
                    : { color: 'var(--muted)', background: 'transparent' }),
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className="flex flex-col gap-5">

            {/* Username — reference .form-group style */}
            <div>
              <label className="block mb-2 theme-transition"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: primary }}>
                Username
              </label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                required placeholder="your_username"
                className="w-full px-4 py-3 font-mono text-sm outline-none transition-colors theme-transition"
                style={{
                  background: 'var(--dark3)', color: 'var(--text)',
                  border: `1px solid ${borderPrimary}`,
                  fontSize: '13px', letterSpacing: '0.5px',
                }}
                onFocus={e => (e.target.style.borderColor = primary)}
                onBlur={e => (e.target.style.borderColor = borderPrimary)}
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="block mb-2 theme-transition"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: primary }}>
                    Email
                  </label>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    required type="email" placeholder="you@example.com"
                    className="w-full px-4 py-3 font-mono text-sm outline-none transition-colors theme-transition"
                    style={{
                      background: 'var(--dark3)', color: 'var(--text)',
                      border: `1px solid ${borderPrimary}`,
                      fontSize: '13px',
                    }}
                    onFocus={e => (e.target.style.borderColor = primary)}
                    onBlur={e => (e.target.style.borderColor = borderPrimary)}
                  />
                </div>
                <div>
                  <label className="block mb-2 theme-transition"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: primary }}>
                    Country
                  </label>
                  <input value={country} onChange={e => setCountry(e.target.value)}
                    required placeholder="e.g. Brazil"
                    className="w-full px-4 py-3 font-mono text-sm outline-none transition-colors theme-transition"
                    style={{
                      background: 'var(--dark3)', color: 'var(--text)',
                      border: `1px solid ${borderPrimary}`,
                      fontSize: '13px',
                    }}
                    onFocus={e => (e.target.style.borderColor = primary)}
                    onBlur={e => (e.target.style.borderColor = borderPrimary)}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block mb-2 theme-transition"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: primary }}>
                Password
              </label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                required type="password" placeholder="••••••••"
                className="w-full px-4 py-3 font-mono text-sm outline-none transition-colors theme-transition"
                style={{
                  background: 'var(--dark3)', color: 'var(--text)',
                  border: `1px solid ${borderPrimary}`,
                  fontSize: '13px',
                }}
                onFocus={e => (e.target.style.borderColor = primary)}
                onBlur={e => (e.target.style.borderColor = borderPrimary)}
              />
            </div>

            {error && (
              <div className="px-4 py-3" style={{ border: '1px solid rgba(255,45,85,0.4)', background: 'rgba(255,45,85,0.06)' }}>
                <p className="font-mono text-xs" style={{ color: 'var(--red)' }}>{error}</p>
              </div>
            )}

            {/* Submit — reference tactics-submit: Bebas Neue + clip-path + shimmer */}
            <button type="submit" disabled={loading}
              className="w-full py-4 font-display transition-all active:scale-95 disabled:opacity-40 btn-cut-lg btn-shimmer theme-transition mt-2"
              style={{
                fontSize: '22px', letterSpacing: '4px', textTransform: 'uppercase',
                background: primary, color: '#000',
              }}>
              {loading ? '...' : mode === 'login' ? 'Enter the Hub' : 'Join the Hunt'}
            </button>
          </form>

          {/* Team indicator */}
          {team && (
            <div className="mt-6 flex items-center gap-3 justify-center">
              <span className="text-2xl">{team.flag}</span>
              <span className="font-mono theme-transition"
                style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: primary }}>
                {team.name}
              </span>
            </div>
          )}

          {/* Bottom label */}
          <p className="text-center mt-8 font-mono"
            style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--muted)', textTransform: 'uppercase' }}>
            Free to play · No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
