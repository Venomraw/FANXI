'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Data ──────────────────────────────────────────────────────────────────

const AVATARS = [
  { id: 'football',    emoji: '⚽', label: 'Football'    },
  { id: 'goalkeeper',  emoji: '🥅', label: 'Goalkeeper'  },
  { id: 'gloves',      emoji: '🧤', label: 'Keeper'      },
  { id: 'tactician',   emoji: '🎯', label: 'Tactician'   },
  { id: 'captain',     emoji: '👑', label: 'Captain'     },
  { id: 'striker',     emoji: '⚡', label: 'Striker'     },
  { id: 'beast',       emoji: '🦁', label: 'Beast Mode'  },
  { id: 'fire',        emoji: '🔥', label: 'Fire'        },
  { id: 'champion',    emoji: '🏆', label: 'Champion'    },
  { id: 'star',        emoji: '🌟', label: 'Star'        },
  { id: 'robot',       emoji: '🤖', label: 'AI Scout'    },
  { id: 'diamond',     emoji: '💎', label: 'Diamond'     },
];

const WC_NATIONS = [
  { name: 'Germany',      flag: '🇩🇪' }, { name: 'France',       flag: '🇫🇷' },
  { name: 'Spain',        flag: '🇪🇸' }, { name: 'England',      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Portugal',     flag: '🇵🇹' }, { name: 'Netherlands',  flag: '🇳🇱' },
  { name: 'Belgium',      flag: '🇧🇪' }, { name: 'Italy',        flag: '🇮🇹' },
  { name: 'Croatia',      flag: '🇭🇷' }, { name: 'Switzerland',  flag: '🇨🇭' },
  { name: 'Denmark',      flag: '🇩🇰' }, { name: 'Austria',      flag: '🇦🇹' },
  { name: 'Serbia',       flag: '🇷🇸' }, { name: 'Hungary',      flag: '🇭🇺' },
  { name: 'Scotland',     flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' }, { name: 'Türkiye',      flag: '🇹🇷' },
  { name: 'Brazil',       flag: '🇧🇷' }, { name: 'Argentina',    flag: '🇦🇷' },
  { name: 'Uruguay',      flag: '🇺🇾' }, { name: 'Colombia',     flag: '🇨🇴' },
  { name: 'Ecuador',      flag: '🇪🇨' }, { name: 'Venezuela',    flag: '🇻🇪' },
  { name: 'USA',          flag: '🇺🇸' }, { name: 'Mexico',       flag: '🇲🇽' },
  { name: 'Canada',       flag: '🇨🇦' }, { name: 'Panama',       flag: '🇵🇦' },
  { name: 'Costa Rica',   flag: '🇨🇷' }, { name: 'Honduras',     flag: '🇭🇳' },
  { name: 'Morocco',      flag: '🇲🇦' }, { name: 'Nigeria',      flag: '🇳🇬' },
  { name: 'Senegal',      flag: '🇸🇳' }, { name: 'Egypt',        flag: '🇪🇬' },
  { name: 'Cameroon',     flag: '🇨🇲' }, { name: 'Ghana',        flag: '🇬🇭' },
  { name: 'South Africa', flag: '🇿🇦' }, { name: 'Mali',         flag: '🇲🇱' },
  { name: 'DR Congo',     flag: '🇨🇩' }, { name: 'Japan',        flag: '🇯🇵' },
  { name: 'South Korea',  flag: '🇰🇷' }, { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Australia',    flag: '🇦🇺' }, { name: 'Iran',         flag: '🇮🇷' },
  { name: 'Qatar',        flag: '🇶🇦' }, { name: 'Uzbekistan',   flag: '🇺🇿' },
  { name: 'Jordan',       flag: '🇯🇴' }, { name: 'Indonesia',    flag: '🇮🇩' },
  { name: 'Iraq',         flag: '🇮🇶' }, { name: 'New Zealand',  flag: '🇳🇿' },
];

const FORMATIONS = [
  { id: '4-3-3',   label: '4-3-3',   rows: [[4], [3], [3]]   },
  { id: '4-2-3-1', label: '4-2-3-1', rows: [[4], [2], [3], [1]] },
  { id: '3-5-2',   label: '3-5-2',   rows: [[3], [5], [2]]   },
  { id: '4-4-2',   label: '4-4-2',   rows: [[4], [4], [2]]   },
  { id: '5-3-2',   label: '5-3-2',   rows: [[5], [3], [2]]   },
];

const TACTICAL_STYLES = [
  { id: 'tiki-taka',      label: 'Tiki-Taka',      icon: '🔄', desc: 'Short passes · possession'    },
  { id: 'counter-attack', label: 'Counter Attack', icon: '⚡', desc: 'Fast transitions · direct'    },
  { id: 'high-press',     label: 'High Press',     icon: '🔥', desc: 'Intense pressure · win high'  },
];

// ── Nation dropdown ────────────────────────────────────────────────────────

function NationSelect({
  value, onChange, placeholder, primary,
}: { value: string; onChange: (v: string) => void; placeholder: string; primary: string }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = WC_NATIONS.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = WC_NATIONS.find(n => n.name === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{
          background: 'rgba(10,25,15,0.6)',
          border: `1px solid ${open ? primary : 'var(--border)'}`,
          color: selected ? 'var(--text)' : 'var(--muted)',
          fontSize: '13px',
        }}
      >
        <span>{selected ? `${selected.flag} ${selected.name}` : placeholder}</span>
        <span style={{ color: 'var(--muted)', fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 overflow-hidden"
          style={{ background: 'rgba(10,25,15,0.95)', border: `1px solid ${primary}`, backdropFilter: 'blur(12px)' }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              aria-label="Search nation"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nation..."
              className="w-full px-3 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-red-500/50"
              style={{ background: 'transparent', color: 'var(--text)', border: 'none' }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filtered.map(n => (
              <button
                key={n.name}
                type="button"
                onClick={() => { onChange(n.name); setSearch(''); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors"
                style={{ color: 'var(--text)' }}
                onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${primary} 10%, transparent)`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{n.flag}</span>
                <span>{n.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-[12px]" style={{ color: 'var(--muted)' }}>No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formation mini-pitch ───────────────────────────────────────────────────

function FormationDots({ rows }: { rows: number[][] }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      {/* GK */}
      <div className="flex gap-1 justify-center">
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--muted)', opacity: 0.5 }} />
      </div>
      {[...rows].reverse().map((row, i) => (
        <div key={i} className="flex gap-1 justify-center">
          {Array.from({ length: row[0] }).map((_, j) => (
            <div key={j} className="w-2 h-2 rounded-full" style={{ background: 'currentColor' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, authFetch, updateUser, isLoading } = useAuth();
  const { primary } = useTheme();
  const router = useRouter();

  // Step animation
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(true);
  const [goingForward, setGoingForward] = useState(true);

  // Step 1
  const [avatarId, setAvatarId] = useState('football');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Step 2
  const [favoriteNation, setFavoriteNation] = useState('');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [formation, setFormation] = useState('');
  const [tacticalStyle, setTacticalStyle] = useState('');

  // Step 3
  const [wcWinner, setWcWinner] = useState('');
  const [topScorer, setTopScorer] = useState('');
  const [biggestUpset, setBiggestUpset] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guard: redirect if already onboarded or not logged in
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user?.onboarding_complete) router.replace('/');
  }, [user, isLoading, router]);

  // Pre-fill username from Google profile
  useEffect(() => {
    if (user && !username) setUsername(user.username);
    if (user && !displayName) setDisplayName(user.display_name || '');
  }, [user]);

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/users/check/${username}`);
        const data = await res.json();
        // If the username matches current user's username it's always "available" for them
        if (username === user?.username) { setUsernameStatus('available'); return; }
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, user?.username]);

  function transition(nextStep: number, forward: boolean) {
    setGoingForward(forward);
    setVisible(false);
    setTimeout(() => { setStep(nextStep); setVisible(true); }, 220);
  }

  const canStep1 = avatarId !== '' && username.length >= 3 && usernameStatus === 'available';
  const canStep2 = favoriteNation !== '' && formation !== '' && tacticalStyle !== '';

  async function handleSubmit(skip = false) {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API}/users/me/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          display_name: displayName || undefined,
          avatar_id: avatarId,
          favorite_nation: favoriteNation || undefined,
          favorite_club: favoriteClub || undefined,
          preferred_formation: formation || undefined,
          tactical_style: tacticalStyle || undefined,
          wc_winner_pick: skip ? undefined : wcWinner || undefined,
          top_scorer_pick: skip ? undefined : topScorer || undefined,
          biggest_upset_pick: skip ? undefined : biggestUpset || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Something went wrong');
        setLoading(false);
        return;
      }
      const updatedUser = await res.json();
      updateUser(updatedUser);
      router.replace('/');
    } catch {
      setError('Connection error');
      setLoading(false);
    }
  }

  if (isLoading || !user) return null;

  const borderPrimary = `color-mix(in srgb, ${primary} 25%, transparent)`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative px-4 py-12 font-sans"
      style={{ color: 'var(--text)' }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 50% at 50% 40%, color-mix(in srgb, ${primary} 4%, transparent), transparent)` }}
      />

      <div className="relative z-10 w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display font-semibold" style={{ fontSize: '2rem', color: primary }}>
            Fan<span style={{ color: 'var(--gold)' }}>XI</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {['Identity', 'DNA', 'Predictions'].map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-7 h-7 font-mono text-xs font-bold transition-all duration-300"
                    style={{
                      borderRadius: '50%',
                      border: `2px solid ${active || done ? primary : 'var(--border)'}`,
                      background: done ? primary : active ? `color-mix(in srgb, ${primary} 15%, transparent)` : 'transparent',
                      color: done ? 'var(--dark)' : active ? primary : 'var(--muted)',
                    }}
                  >
                    {done ? '✓' : n}
                  </div>
                  <span
                    className="font-mono text-xs tracking-widest uppercase hidden sm:block transition-colors duration-300"
                    style={{ color: active ? primary : 'var(--muted)' }}
                  >
                    {label}
                  </span>
                  {i < 2 && (
                    <div
                      className="flex-1 h-px w-16 mx-2 transition-all duration-500"
                      style={{ background: step > n ? primary : 'var(--border)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress fill bar */}
          <div className="h-0.5 rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / 2) * 100}%`, background: primary }}
            />
          </div>
        </div>

        {/* Step card */}
        <div
          className="p-6 sm:p-8 transition-all duration-220"
          style={{
            background: 'rgba(10,25,15,0.75)',
            border: `1px solid ${borderPrimary}`,
            backdropFilter: 'blur(24px)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : goingForward ? 'translateX(-16px)' : 'translateX(16px)',
          }}
        >

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>
              <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: primary }}>
                // Step 01 — Identity
              </div>
              <h2 className="font-display font-semibold mb-6 leading-none" style={{ fontSize: 'clamp(28px,5vw,40px)', letterSpacing: '0.5px' }}>
                WHO ARE YOU?
              </h2>

              {/* Avatar picker */}
              <div className="mb-6">
                <label className="block font-mono text-xs tracking-widest uppercase mb-3" style={{ color: primary }}>
                  Pick your avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAvatarId(a.id)}
                      title={a.label}
                      className="flex flex-col items-center gap-1 py-2 transition-all duration-200"
                      style={{
                        border: `2px solid ${avatarId === a.id ? primary : 'var(--border)'}`,
                        background: avatarId === a.id ? `color-mix(in srgb, ${primary} 12%, transparent)` : 'transparent',
                        boxShadow: avatarId === a.id ? `0 0 12px color-mix(in srgb, ${primary} 30%, transparent)` : 'none',
                      }}
                    >
                      <span style={{ fontSize: '22px' }}>{a.emoji}</span>
                      <span className="font-mono text-[7px] tracking-wide hidden sm:block" style={{ color: 'var(--muted)' }}>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Username */}
              <div className="mb-4">
                <label className="block font-mono text-xs tracking-widest uppercase mb-2" style={{ color: primary }}>
                  Username *
                </label>
                <div className="relative">
                  <input
                    aria-label="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    maxLength={20}
                    placeholder="your_handle"
                    className="w-full px-4 py-3 font-mono text-[13px] outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                    style={{
                      background: 'rgba(10,25,15,0.6)',
                      color: 'var(--text)',
                      border: `1px solid ${usernameStatus === 'available' ? 'var(--success)' : usernameStatus === 'taken' ? 'var(--red)' : 'var(--border)'}`,
                    }}
                    onFocus={e => (e.target.style.borderColor = primary)}
                    onBlur={e => {
                      if (usernameStatus === 'available') e.target.style.borderColor = 'var(--success)';
                      else if (usernameStatus === 'taken') e.target.style.borderColor = 'var(--red)';
                      else e.target.style.borderColor = 'var(--border)';
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs">
                    {usernameStatus === 'checking' && <span style={{ color: 'var(--muted)' }}>...</span>}
                    {usernameStatus === 'available' && <span style={{ color: 'var(--success)' }}>✓</span>}
                    {usernameStatus === 'taken' && <span style={{ color: 'var(--red)' }}>✗ taken</span>}
                  </div>
                </div>
                <p className="mt-1 font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  3–20 chars · letters, numbers, underscore
                </p>
              </div>

              {/* Display name */}
              <div className="mb-6">
                <label className="block font-mono text-xs tracking-widest uppercase mb-2" style={{ color: primary }}>
                  Display name <span style={{ color: 'var(--muted)' }}>(optional)</span>
                </label>
                <input
                  aria-label="Display name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={40}
                  placeholder="How you appear on the leaderboard"
                  className="w-full px-4 py-3 font-mono text-[13px] outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                  style={{
                    background: 'rgba(10,25,15,0.6)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  onFocus={e => (e.target.style.borderColor = primary)}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              <button
                disabled={!canStep1}
                onClick={() => transition(2, true)}
                className="w-full py-3.5 font-display font-semibold transition-all disabled:opacity-30"
                style={{
                  background: primary,
                  color: 'var(--dark)',
                  fontSize: '18px',
                  letterSpacing: '1px',
                  clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
                  boxShadow: canStep1 ? `0 0 20px color-mix(in srgb, ${primary} 35%, transparent)` : 'none',
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div>
              <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: primary }}>
                // Step 02 — Football DNA
              </div>
              <h2 className="font-display font-semibold mb-6 leading-none" style={{ fontSize: 'clamp(28px,5vw,40px)', letterSpacing: '0.5px' }}>
                YOUR FOOTBALL<br /><span style={{ color: primary }}>DNA</span>
              </h2>

              {/* Favorite nation */}
              <div className="mb-4">
                <label className="block font-mono text-xs tracking-widest uppercase mb-2" style={{ color: primary }}>
                  Favourite Nation *
                </label>
                <NationSelect
                  value={favoriteNation}
                  onChange={setFavoriteNation}
                  placeholder="Pick your nation..."
                  primary={primary}
                />
              </div>

              {/* Favorite club */}
              <div className="mb-5">
                <label className="block font-mono text-xs tracking-widest uppercase mb-2" style={{ color: primary }}>
                  Favourite Club <span style={{ color: 'var(--muted)' }}>(optional)</span>
                </label>
                <input
                  aria-label="Favourite club"
                  value={favoriteClub}
                  onChange={e => setFavoriteClub(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. Barcelona, Bayern Munich..."
                  className="w-full px-4 py-3 font-mono text-[13px] outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                  style={{
                    background: 'rgba(10,25,15,0.6)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  onFocus={e => (e.target.style.borderColor = primary)}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Formation */}
              <div className="mb-5">
                <label className="block font-mono text-xs tracking-widest uppercase mb-3" style={{ color: primary }}>
                  Preferred Formation *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {FORMATIONS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormation(f.id)}
                      className="flex flex-col items-center gap-1 py-3 px-1 transition-all duration-200"
                      style={{
                        border: `2px solid ${formation === f.id ? primary : 'var(--border)'}`,
                        background: formation === f.id ? `color-mix(in srgb, ${primary} 12%, transparent)` : 'transparent',
                        color: formation === f.id ? primary : 'var(--muted)',
                        boxShadow: formation === f.id ? `0 0 12px color-mix(in srgb, ${primary} 25%, transparent)` : 'none',
                      }}
                    >
                      <FormationDots rows={f.rows} />
                      <span className="font-mono text-xs tracking-wide mt-1">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tactical style */}
              <div className="mb-6">
                <label className="block font-mono text-xs tracking-widest uppercase mb-3" style={{ color: primary }}>
                  Tactical Style *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TACTICAL_STYLES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTacticalStyle(t.id)}
                      className="flex flex-col items-center gap-2 p-3 text-center transition-all duration-200"
                      style={{
                        border: `2px solid ${tacticalStyle === t.id ? primary : 'var(--border)'}`,
                        background: tacticalStyle === t.id ? `color-mix(in srgb, ${primary} 12%, transparent)` : 'transparent',
                        boxShadow: tacticalStyle === t.id ? `0 0 12px color-mix(in srgb, ${primary} 25%, transparent)` : 'none',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{t.icon}</span>
                      <span className="font-sans font-semibold text-xs" style={{ color: tacticalStyle === t.id ? primary : 'var(--text)' }}>{t.label}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => transition(1, false)}
                  className="px-5 py-3.5 font-sans font-semibold text-[13px] transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  ← Back
                </button>
                <button
                  disabled={!canStep2}
                  onClick={() => transition(3, true)}
                  className="flex-1 py-3.5 font-display font-semibold transition-all disabled:opacity-30"
                  style={{
                    background: primary,
                    color: 'var(--dark)',
                    fontSize: '18px',
                    letterSpacing: '1px',
                    clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
                    boxShadow: canStep2 ? `0 0 20px color-mix(in srgb, ${primary} 35%, transparent)` : 'none',
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div>
              <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: primary }}>
                // Step 03 — Bold Predictions
              </div>
              <h2 className="font-display font-semibold mb-1 leading-none" style={{ fontSize: 'clamp(28px,5vw,40px)', letterSpacing: '0.5px' }}>
                BOLD<br /><span style={{ color: primary }}>PREDICTIONS</span>
              </h2>
              <p className="font-sans text-[13px] mb-6" style={{ color: 'var(--muted)' }}>
                Lock in your World Cup 2026 calls. All optional.
              </p>

              {/* WC Winner */}
              <div className="mb-4">
                <label className="block font-mono text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>
                  🏆 World Cup 2026 Winner
                </label>
                <NationSelect
                  value={wcWinner}
                  onChange={setWcWinner}
                  placeholder="Who lifts the trophy?"
                  primary={primary}
                />
              </div>

              {/* Top scorer */}
              <div className="mb-4">
                <label className="block font-mono text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>
                  ⚽ Top Scorer
                </label>
                <input
                  aria-label="Top scorer"
                  value={topScorer}
                  onChange={e => setTopScorer(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. Kylian Mbappé"
                  className="w-full px-4 py-3 font-mono text-[13px] outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                  style={{
                    background: 'rgba(10,25,15,0.6)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  onFocus={e => (e.target.style.borderColor = primary)}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Biggest upset */}
              <div className="mb-6">
                <label className="block font-mono text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>
                  💥 Biggest Upset
                </label>
                <input
                  aria-label="Biggest upset"
                  value={biggestUpset}
                  onChange={e => setBiggestUpset(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Saudi Arabia beat Germany in the group stage"
                  className="w-full px-4 py-3 font-mono text-[13px] outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                  style={{
                    background: 'rgba(10,25,15,0.6)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                  onFocus={e => (e.target.style.borderColor = primary)}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {error && (
                <div className="mb-4 px-4 py-3" style={{ border: '1px solid rgba(255,45,85,0.4)', background: 'rgba(255,45,85,0.06)' }}>
                  <p className="font-mono text-xs" style={{ color: 'var(--red)' }}>{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => transition(2, false)}
                  className="px-5 py-3.5 font-sans font-semibold text-[13px] transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  ← Back
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleSubmit(false)}
                  className="flex-1 py-3.5 font-display font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: primary,
                    color: 'var(--dark)',
                    fontSize: '18px',
                    letterSpacing: '1px',
                    clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
                    boxShadow: `0 0 20px color-mix(in srgb, ${primary} 35%, transparent)`,
                  }}
                >
                  {loading ? '...' : 'Enter the Hub ⚽'}
                </button>
              </div>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="font-mono text-xs tracking-widest uppercase transition-colors"
                  style={{ color: 'var(--muted)', background: 'none', border: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  Skip predictions for now →
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Step label */}
        <p className="text-center mt-4 font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
          Step {step} of 3 · World Cup 2026 · Free to play
        </p>
      </div>
    </div>
  );
}
