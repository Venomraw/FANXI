'use client';
import React, { useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { WC2026_TEAMS } from '@/src/data/teamColors';

const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const;

export default function TeamPicker() {
  const { setTeam, showPicker, setShowPicker, team: currentTeam, primary } = useTheme();
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  if (!showPicker) return null;

  const filtered = WC2026_TEAMS.filter(t => {
    const matchesConf = filter === 'ALL' || t.confederation === filter;
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.shortName.toLowerCase().includes(search.toLowerCase());
    return matchesConf && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(24px)' }}>
      <div className="w-full max-w-2xl border shadow-2xl overflow-hidden"
        style={{
          background: 'var(--dark3)',
          borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
        }}>

        {/* Header */}
        <div className="p-6 border-b"
          style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-3xl tracking-widest uppercase theme-transition"
              style={{ color: primary }}>
              Pick Your Nation
            </h2>
            {currentTeam && (
              <button onClick={() => setShowPicker(false)}
                className="font-mono text-xs tracking-widest uppercase transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = primary)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                Cancel
              </button>
            )}
          </div>
          <p className="font-mono text-xs uppercase tracking-[4px]" style={{ color: 'var(--muted)' }}>
            FIFA World Cup 2026 · 48 Nations
          </p>

          {/* Search */}
          <input
            type="text"
            placeholder="Search team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mt-4 w-full border px-4 py-2.5 font-mono text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors text-[var(--text)]"
            style={{
              background: 'var(--dark2)',
              borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
            }}
            onFocus={e => (e.target.style.borderColor = primary)}
            onBlur={e => (e.target.style.borderColor = `color-mix(in srgb, ${primary} 20%, transparent)`)}
          />

          {/* Confederation filter */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(['ALL', ...CONFEDERATIONS] as const).map(conf => (
              <button key={conf} onClick={() => setFilter(conf)}
                className="px-3 py-1.5 font-mono text-xs tracking-widest uppercase border transition-all theme-transition"
                style={filter === conf
                  ? { background: primary, color: 'var(--dark)', borderColor: primary }
                  : {
                      borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
                      color: 'var(--muted)',
                      background: 'transparent',
                    }}>
                {conf}
              </button>
            ))}
          </div>
        </div>

        {/* Team Grid */}
        <div className="p-4 max-h-[400px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 custom-scrollbar">
          {filtered.map(t => (
            <button key={t.id} onClick={() => setTeam(t)}
              className="flex items-center gap-3 p-3 border transition-all text-left group theme-transition"
              style={currentTeam?.id === t.id
                ? {
                    background: `color-mix(in srgb, ${t.primary} 15%, transparent)`,
                    borderColor: t.primary,
                  }
                : {
                    background: 'var(--dark2)',
                    borderColor: `color-mix(in srgb, ${t.primary} 12%, transparent)`,
                  }}
              onMouseEnter={e => {
                if (currentTeam?.id !== t.id) {
                  (e.currentTarget as HTMLElement).style.borderColor = t.primary;
                  (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${t.primary} 8%, transparent)`;
                }
              }}
              onMouseLeave={e => {
                if (currentTeam?.id !== t.id) {
                  (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${t.primary} 12%, transparent)`;
                  (e.currentTarget as HTMLElement).style.background = 'var(--dark2)';
                }
              }}>
              {/* Flag circle */}
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-xl"
                style={{
                  background: `${t.primary}18`,
                  border: `1.5px solid ${t.primary}40`,
                }}>
                {t.flag}
              </div>
              <div className="min-w-0">
                <div className="text-[var(--text)] text-xs font-bold truncate">{t.name}</div>
                <div className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  {t.confederation}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center"
          style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}>
          <p className="font-mono text-xs uppercase tracking-[3px]" style={{ color: 'var(--muted)' }}>
            Colors adapt to your chosen nation
          </p>
        </div>
      </div>
    </div>
  );
}
