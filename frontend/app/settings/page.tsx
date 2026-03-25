'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import NavBar from '@/src/components/NavBar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AVATARS = [
  { id: 'football',    emoji: '⚽' },
  { id: 'goalkeeper',  emoji: '🥅' },
  { id: 'gloves',      emoji: '🧤' },
  { id: 'tactician',   emoji: '🎯' },
  { id: 'captain',     emoji: '👑' },
  { id: 'striker',     emoji: '⚡' },
  { id: 'beast',       emoji: '🦁' },
  { id: 'fire',        emoji: '🔥' },
  { id: 'champion',    emoji: '🏆' },
  { id: 'star',        emoji: '🌟' },
  { id: 'robot',       emoji: '🤖' },
  { id: 'diamond',     emoji: '💎' },
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

const FORMATIONS = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '5-3-2'];

const TACTICAL_STYLES = [
  { id: 'tiki-taka',      label: 'Tiki-Taka',      icon: '🔄' },
  { id: 'counter-attack', label: 'Counter Attack', icon: '⚡' },
  { id: 'high-press',     label: 'High Press',     icon: '🔥' },
];

function NationSelect({
  value, onChange, primary,
}: { value: string; onChange: (v: string) => void; primary: string }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = WC_NATIONS.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = WC_NATIONS.find(n => n.name === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 text-left font-sans font-semibold text-[14px] border flex items-center justify-between transition-all"
        style={{
          background: 'var(--dark3)',
          borderColor: open ? primary : 'var(--border)',
          color: selected ? 'var(--text)' : 'var(--muted)',
        }}
      >
        <span>{selected ? `${selected.flag} ${selected.name}` : 'Select nation…'}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 border max-h-48 overflow-y-auto" style={{ background: 'rgba(6,10,6,0.98)', backdropFilter: 'blur(24px)', borderColor: 'var(--border)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              aria-label="Search nation"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nation…"
              className="w-full px-3 py-2 font-sans text-[13px] border"
              style={{ background: 'var(--dark)', borderColor: 'var(--border)', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          {filtered.map(n => (
            <button
              key={n.name}
              type="button"
              onClick={() => { onChange(n.name); setOpen(false); setSearch(''); }}
              className="w-full text-left px-4 py-2.5 font-sans text-[14px] flex items-center gap-2 transition-colors"
              style={{ color: n.name === value ? primary : 'var(--text)', background: 'none', border: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${primary} 8%, transparent)`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span>{n.flag}</span>
              <span>{n.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-3 font-sans text-[13px]" style={{ color: 'var(--muted)' }}>No results</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, updateUser, authFetch } = useAuth();
  const { primary } = useTheme();

  const [username, setUsername]         = useState('');
  const [displayName, setDisplayName]   = useState('');
  const [avatarId, setAvatarId]         = useState('football');
  const [nation, setNation]             = useState('');
  const [club, setClub]                 = useState('');
  const [formation, setFormation]       = useState('');
  const [tacticalStyle, setTacticalStyle] = useState('');

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState<{ ok: boolean; text: string } | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && token === null) return; // still loading
    if (!user) router.replace('/login');
  }, [user, token, router]);

  // Pre-populate from current user data
  useEffect(() => {
    if (!user) return;
    setUsername(user.username ?? '');
    setDisplayName(user.display_name ?? '');
    setAvatarId(user.avatar_id ?? 'football');
    setNation(user.favorite_nation ?? user.country_allegiance ?? '');
    setClub(user.favorite_club ?? '');
    setFormation(user.preferred_formation ?? '');
    setTacticalStyle(user.tactical_style ?? '');
  }, [user]);

  // Username availability check (debounced)
  useEffect(() => {
    if (!user || username === user.username) { setUsernameStatus('idle'); return; }
    if (username.length < 3) { setUsernameStatus('idle'); return; }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/users/check/${encodeURIComponent(username)}`);
        const { available } = await res.json();
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username, user]);

  const canSave = usernameStatus !== 'taken' && username.length >= 3 && !saving;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || !user) return;

    setSaving(true);
    try {
      const res = await authFetch(`${API}/users/me/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          display_name: displayName || null,
          avatar_id: avatarId || null,
          favorite_nation: nation || null,
          favorite_club: club || null,
          preferred_formation: formation || null,
          tactical_style: tacticalStyle || null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        updateUser({ ...user, ...updated });
        setToast({ ok: true, text: 'Profile updated successfully.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ ok: false, text: err.detail ?? 'Save failed. Try again.' });
      }
    } catch {
      setToast({ ok: false, text: 'Connection error.' });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3500);
  }

  if (!user) return null;

  const avatarEmoji = AVATARS.find(a => a.id === avatarId)?.emoji ?? '⚽';

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <NavBar subtitle="SETTINGS" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 28px 80px' }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-semibold leading-none mb-2" style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', color: 'var(--text)' }}>
            Settings
          </h1>
          <p className="font-sans text-[15px]" style={{ color: 'var(--muted)' }}>
            Update your profile, identity, and tactical preferences.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="mb-6 px-5 py-3.5 font-sans font-semibold text-[14px] border"
            style={{
              background: toast.ok ? 'rgba(0,255,133,0.08)' : 'rgba(255,45,85,0.08)',
              borderColor: toast.ok ? 'rgba(0,255,133,0.3)' : 'rgba(255,45,85,0.3)',
              color: toast.ok ? 'var(--success)' : 'var(--red)',
            }}
          >
            {toast.text}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6">

          {/* ── Identity ── */}
          <section
            className="border p-6 flex flex-col gap-5"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', borderColor: 'var(--border)' }}
          >
            <h2 className="font-sans font-semibold text-[16px] uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>
              Identity
            </h2>

            {/* Avatar */}
            <div>
              <p className="font-mono text-xs uppercase tracking-[1.5px] mb-3" style={{ color: 'var(--muted)' }}>Avatar</p>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatarId(a.id)}
                    className="aspect-square flex items-center justify-center text-2xl border transition-all"
                    style={{
                      background: avatarId === a.id ? `color-mix(in srgb, ${primary} 18%, transparent)` : 'var(--dark3)',
                      borderColor: avatarId === a.id ? primary : 'var(--border)',
                      boxShadow: avatarId === a.id ? `0 0 12px color-mix(in srgb, ${primary} 30%, transparent)` : 'none',
                    }}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="w-12 h-12 flex items-center justify-center text-2xl border"
                  style={{ background: `color-mix(in srgb, ${primary} 18%, transparent)`, borderColor: primary }}
                >
                  {avatarEmoji}
                </div>
                <span className="font-sans text-[13px]" style={{ color: 'var(--muted)' }}>Selected avatar</span>
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="font-mono text-xs uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--muted)' }}>
                Display Name
              </label>
              <input
                aria-label="Display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How you appear to others"
                maxLength={40}
                className="w-full px-4 py-3 font-sans text-[14px] border outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                style={{ background: 'var(--dark3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                onFocus={e => (e.currentTarget.style.borderColor = primary)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Username */}
            <div>
              <label className="font-mono text-xs uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--muted)' }}>
                Username
              </label>
              <div className="relative">
                <input
                  aria-label="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                  placeholder="your_handle"
                  className="w-full px-4 py-3 pr-24 font-sans text-[14px] border outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                  style={{ background: 'var(--dark3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = primary)}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs uppercase tracking-wider"
                  style={{
                    color: usernameStatus === 'available' ? 'var(--success)'
                         : usernameStatus === 'taken'     ? 'var(--red)'
                         : usernameStatus === 'checking'  ? primary
                         : 'var(--muted)',
                  }}
                >
                  {usernameStatus === 'checking'  && 'Checking…'}
                  {usernameStatus === 'available' && 'Available'}
                  {usernameStatus === 'taken'     && 'Taken'}
                  {usernameStatus === 'idle' && username === user.username && 'Current'}
                </span>
              </div>
              <p className="font-mono text-xs mt-1.5" style={{ color: 'var(--muted)' }}>3–20 chars, letters/numbers/underscore only</p>
            </div>
          </section>

          {/* ── Football DNA ── */}
          <section
            className="border p-6 flex flex-col gap-5"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', borderColor: 'var(--border)' }}
          >
            <h2 className="font-sans font-semibold text-[16px] uppercase tracking-[1px]" style={{ color: 'var(--muted)' }}>
              Football DNA
            </h2>

            {/* Nation */}
            <div>
              <label className="font-mono text-xs uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--muted)' }}>
                Favourite Nation
              </label>
              <NationSelect value={nation} onChange={setNation} primary={primary} />
            </div>

            {/* Club */}
            <div>
              <label className="font-mono text-xs uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--muted)' }}>
                Favourite Club
              </label>
              <input
                aria-label="Favourite club"
                value={club}
                onChange={e => setClub(e.target.value)}
                placeholder="e.g. Real Madrid"
                maxLength={50}
                className="w-full px-4 py-3 font-sans text-[14px] border outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                style={{ background: 'var(--dark3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                onFocus={e => (e.currentTarget.style.borderColor = primary)}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Formation */}
            <div>
              <label className="font-mono text-xs uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--muted)' }}>
                Preferred Formation
              </label>
              <div className="flex gap-2 flex-wrap">
                {FORMATIONS.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormation(f)}
                    className="px-4 py-2 font-mono text-xs border transition-all"
                    style={{
                      background: formation === f ? `color-mix(in srgb, ${primary} 16%, transparent)` : 'var(--dark3)',
                      borderColor: formation === f ? primary : 'var(--border)',
                      color: formation === f ? primary : 'var(--muted)',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical style */}
            <div>
              <label className="font-mono text-xs uppercase tracking-[1.5px] block mb-2" style={{ color: 'var(--muted)' }}>
                Tactical Style
              </label>
              <div className="flex flex-col gap-2">
                {TACTICAL_STYLES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTacticalStyle(s.id)}
                    className="flex items-center gap-3 px-4 py-3 border font-sans font-semibold text-[14px] text-left transition-all"
                    style={{
                      background: tacticalStyle === s.id ? `color-mix(in srgb, ${primary} 12%, transparent)` : 'var(--dark3)',
                      borderColor: tacticalStyle === s.id ? primary : 'var(--border)',
                      color: tacticalStyle === s.id ? 'var(--text)' : 'var(--muted)',
                    }}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span>{s.label}</span>
                    {tacticalStyle === s.id && (
                      <span className="ml-auto font-mono text-xs" style={{ color: primary }}>Selected</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 py-4 font-sans font-semibold text-[15px] border transition-all"
              style={{
                background: canSave ? primary : 'var(--dark3)',
                borderColor: canSave ? primary : 'var(--border)',
                color: canSave ? 'var(--dark)' : 'var(--muted)',
                cursor: canSave ? 'pointer' : 'not-allowed',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-8 py-4 font-sans font-semibold text-[15px] border transition-all"
              style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
