'use client';
import React, { useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';
import { WC2026_TEAMS, WCTeam } from '@/src/data/teamColors';

const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const;

export default function TeamPicker() {
  const { setTeam, showPicker, setShowPicker, team: currentTeam } = useTheme();
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  if (!showPicker) return null;

  const filtered = WC2026_TEAMS.filter(t => {
    const matchesConf = filter === 'ALL' || t.confederation === filter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                          t.shortName.toLowerCase().includes(search.toLowerCase());
    return matchesConf && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">
              Pick Your Nation
            </h2>
            {currentTeam && (
              <button onClick={() => setShowPicker(false)}
                className="text-zinc-500 hover:text-white text-xs uppercase font-bold transition-colors">
                Cancel
              </button>
            )}
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest">
            FIFA World Cup 2026 · 48 Nations
          </p>

          {/* Search */}
          <input
            type="text"
            placeholder="Search team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mt-4 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />

          {/* Confederation filter */}
          <div className="flex flex-wrap gap-2 mt-3">
            {(['ALL', ...CONFEDERATIONS] as const).map(conf => (
              <button key={conf} onClick={() => setFilter(conf)}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition-all ${
                  filter === conf
                    ? 'bg-white text-black border-white'
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-white'
                }`}>
                {conf}
              </button>
            ))}
          </div>
        </div>

        {/* Team Grid */}
        <div className="p-4 max-h-[420px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filtered.map(t => (
            <button key={t.id} onClick={() => setTeam(t)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                currentTeam?.id === t.id
                  ? 'border-white bg-white/10'
                  : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {/* Color swatch */}
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-lg"
                style={{ backgroundColor: t.primary, border: `2px solid ${t.accent}` }}>
                <span>{t.flag}</span>
              </div>
              <div className="min-w-0">
                <div className="text-white text-[11px] font-bold truncate">{t.name}</div>
                <div className="text-zinc-500 text-[9px] uppercase">{t.confederation}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 text-center">
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest">
            Colors adapt to your chosen nation
          </p>
        </div>
      </div>
    </div>
  );
}
