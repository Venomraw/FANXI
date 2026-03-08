'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import NavBar from '@/src/components/NavBar';

// ── Static WC 2026 team list ────────────────────────────────────────────────

interface WCTeamMeta {
  name: string;
  flag: string;
  group: string;
  confederation: string;
}

const WC2026_TEAMS: WCTeamMeta[] = [
  { name: 'Mexico',        flag: '🇲🇽', group: 'A', confederation: 'CONCACAF' },
  { name: 'USA',           flag: '🇺🇸', group: 'A', confederation: 'CONCACAF' },
  { name: 'Canada',        flag: '🇨🇦', group: 'A', confederation: 'CONCACAF' },
  { name: 'Uruguay',       flag: '🇺🇾', group: 'A', confederation: 'CONMEBOL' },
  { name: 'Argentina',     flag: '🇦🇷', group: 'B', confederation: 'CONMEBOL' },
  { name: 'Ecuador',       flag: '🇪🇨', group: 'B', confederation: 'CONMEBOL' },
  { name: 'Chile',         flag: '🇨🇱', group: 'B', confederation: 'CONMEBOL' },
  { name: 'Peru',          flag: '🇵🇪', group: 'B', confederation: 'CONMEBOL' },
  { name: 'France',        flag: '🇫🇷', group: 'C', confederation: 'UEFA' },
  { name: 'Morocco',       flag: '🇲🇦', group: 'C', confederation: 'CAF' },
  { name: 'Belgium',       flag: '🇧🇪', group: 'C', confederation: 'UEFA' },
  { name: 'Switzerland',   flag: '🇨🇭', group: 'C', confederation: 'UEFA' },
  { name: 'Brazil',        flag: '🇧🇷', group: 'D', confederation: 'CONMEBOL' },
  { name: 'Colombia',      flag: '🇨🇴', group: 'D', confederation: 'CONMEBOL' },
  { name: 'Paraguay',      flag: '🇵🇾', group: 'D', confederation: 'CONMEBOL' },
  { name: 'Venezuela',     flag: '🇻🇪', group: 'D', confederation: 'CONMEBOL' },
  { name: 'England',       flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'E', confederation: 'UEFA' },
  { name: 'Senegal',       flag: '🇸🇳', group: 'E', confederation: 'CAF' },
  { name: 'Netherlands',   flag: '🇳🇱', group: 'E', confederation: 'UEFA' },
  { name: 'Iran',          flag: '🇮🇷', group: 'E', confederation: 'AFC' },
  { name: 'Spain',         flag: '🇪🇸', group: 'F', confederation: 'UEFA' },
  { name: 'Japan',         flag: '🇯🇵', group: 'F', confederation: 'AFC' },
  { name: 'South Korea',   flag: '🇰🇷', group: 'F', confederation: 'AFC' },
  { name: 'Saudi Arabia',  flag: '🇸🇦', group: 'F', confederation: 'AFC' },
  { name: 'Germany',       flag: '🇩🇪', group: 'G', confederation: 'UEFA' },
  { name: 'Austria',       flag: '🇦🇹', group: 'G', confederation: 'UEFA' },
  { name: 'Poland',        flag: '🇵🇱', group: 'G', confederation: 'UEFA' },
  { name: 'Ukraine',       flag: '🇺🇦', group: 'G', confederation: 'UEFA' },
  { name: 'Portugal',      flag: '🇵🇹', group: 'H', confederation: 'UEFA' },
  { name: 'Nigeria',       flag: '🇳🇬', group: 'H', confederation: 'CAF' },
  { name: 'Ghana',         flag: '🇬🇭', group: 'H', confederation: 'CAF' },
  { name: 'Cameroon',      flag: '🇨🇲', group: 'H', confederation: 'CAF' },
  { name: 'Croatia',       flag: '🇭🇷', group: 'I', confederation: 'UEFA' },
  { name: 'Algeria',       flag: '🇩🇿', group: 'I', confederation: 'CAF' },
  { name: 'Tunisia',       flag: '🇹🇳', group: 'I', confederation: 'CAF' },
  { name: 'Egypt',         flag: '🇪🇬', group: 'I', confederation: 'CAF' },
  { name: 'Australia',     flag: '🇦🇺', group: 'J', confederation: 'AFC' },
  { name: 'New Zealand',   flag: '🇳🇿', group: 'J', confederation: 'OFC' },
  { name: 'Serbia',        flag: '🇷🇸', group: 'J', confederation: 'UEFA' },
  { name: 'Turkey',        flag: '🇹🇷', group: 'J', confederation: 'UEFA' },
  { name: 'Costa Rica',    flag: '🇨🇷', group: 'K', confederation: 'CONCACAF' },
  { name: 'Panama',        flag: '🇵🇦', group: 'K', confederation: 'CONCACAF' },
  { name: 'Jamaica',       flag: '🇯🇲', group: 'K', confederation: 'CONCACAF' },
  { name: 'Bolivia',       flag: '🇧🇴', group: 'K', confederation: 'CONMEBOL' },
  { name: 'Italy',         flag: '🇮🇹', group: 'L', confederation: 'UEFA' },
  { name: 'South Africa',  flag: '🇿🇦', group: 'L', confederation: 'CAF' },
  { name: "Côte d'Ivoire", flag: '🇨🇮', group: 'L', confederation: 'CAF' },
  { name: 'Czech Republic',flag: '🇨🇿', group: 'L', confederation: 'UEFA' },
];

// ── Types ───────────────────────────────────────────────────────────────────

interface Player {
  name: string;
  number: number;
  position: string;
}

interface Fixture {
  id: number;
  home_team: string;
  home_flag: string;
  away_team: string;
  away_flag: string;
  kickoff: string;
  venue: string;
  round: string;
  group: string;
  matchday: number;
}

interface Standing {
  team: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

interface Article {
  id?: string;
  title: string;
  url: string;
  published: string;
  thumbnail?: string;
  trail?: string;
  byline?: string;
  source?: string;
}

interface RedditPost {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  score: number;
  comments: number;
  thumbnail?: string;
  flair?: string;
  author: string;
  created: number;
  selftext?: string;
}

interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail?: string;
  published: string;
  description?: string;
}

// ── Position config ─────────────────────────────────────────────────────────

const POS_COLORS: Record<string, string> = {
  GK: '#FFD23F',
  RB: '#00D1FF', LB: '#00D1FF', CB: '#00D1FF',
  CDM: '#00FF85', CM: '#00FF85', CAM: '#00FF85',
  RW: '#FF6B6B', LW: '#FF6B6B', ST: '#FF6B6B',
};

const POS_FILTER_GROUPS: Record<string, string[]> = {
  GK:  ['GK'],
  DEF: ['RB', 'CB', 'LB'],
  MID: ['CDM', 'CM', 'CAM'],
  FWD: ['RW', 'LW', 'ST'],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function timeAgo(dateStr: string | number): string {
  const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatScore(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function formatKickoff(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── AI text renderer ─────────────────────────────────────────────────────────

function renderAIBlock(text: string, primary: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  const renderInline = (s: string, key: string) => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {parts.map((p, i) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
            : <span key={i}>{p}</span>
        )}
      </span>
    );
  };

  const SECTION_RE = /^([⚡📐👥💪⚠️🎯🧠🎙️✅❌🏆🔄])\s+(.+)/u;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { nodes.push(<div key={`sp-${i}`} className="h-2" />); continue; }

    const sectionMatch = SECTION_RE.exec(line);
    if (sectionMatch) {
      nodes.push(
        <div key={`sec-${i}`} className="mt-5 mb-2 pb-2 border-b"
          style={{ borderColor: `color-mix(in srgb, ${primary} 20%, transparent)` }}>
          <span className="font-display font-semibold tracking-wide"
            style={{ fontSize: '15px', color: primary }}>
            {sectionMatch[1]} {sectionMatch[2].replace(/^[A-Z\s—]+$/, s => s)}
          </span>
        </div>
      );
      continue;
    }

    if (/^[-•▸]\s/.test(line) || /^\d+\.\s/.test(line)) {
      nodes.push(
        <div key={`li-${i}`} className="flex gap-2 pl-2 text-[13px] leading-relaxed"
          style={{ color: 'var(--muted)' }}>
          <span style={{ color: primary, flexShrink: 0 }}>▸</span>
          {renderInline(line.replace(/^[-•▸\d.]+\s/, ''), `li-inner-${i}`)}
        </div>
      );
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
        {renderInline(line, `p-inner-${i}`)}
      </p>
    );
  }
  return nodes;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse ${className}`} style={{ background: 'var(--border)' }} />;
}

function SectionHead({ icon, label, sub, primary }: { icon: string; label: string; sub?: string; primary: string }) {
  return (
    <div className="flex items-end gap-3 mb-5">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="font-display font-semibold leading-none uppercase"
          style={{ fontSize: '32px', color: primary }}>{label}</h2>
        {sub && <p className="font-mono text-[10px] uppercase tracking-widest mt-1" style={{ color: 'var(--muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// Team Selector Dropdown
function TeamSelector({
  selected,
  onSelect,
  primary,
}: {
  selected: WCTeamMeta | null;
  onSelect: (t: WCTeamMeta) => void;
  primary: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = WC2026_TEAMS.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.group.toLowerCase().includes(query.toLowerCase()) ||
    t.confederation.toLowerCase().includes(query.toLowerCase())
  );

  // Group by letter
  const grouped: Record<string, WCTeamMeta[]> = {};
  for (const t of filtered) {
    if (!grouped[t.group]) grouped[t.group] = [];
    grouped[t.group].push(t);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); setQuery(''); }}
        className="flex items-center gap-3 px-4 py-2.5 border transition-all"
        style={{
          background: open ? `color-mix(in srgb, ${primary} 10%, var(--dark3))` : 'var(--dark3)',
          borderColor: open ? primary : 'var(--border)',
          color: 'var(--text)',
          minWidth: '220px',
        }}>
        {selected ? (
          <>
            <span className="text-xl">{selected.flag}</span>
            <div className="flex-1 text-left">
              <div className="font-display font-semibold text-[14px]">{selected.name}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Group {selected.group} · {selected.confederation}
              </div>
            </div>
          </>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Select a Nation
          </span>
        )}
        <span className="font-mono text-[11px] ml-auto" style={{ color: 'var(--muted)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 overflow-hidden border"
          style={{
            background: 'var(--dark3)',
            borderColor: primary,
            width: '280px',
            maxHeight: '420px',
            overflowY: 'auto',
            boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 30px color-mix(in srgb, ${primary} 15%, transparent)`,
          }}>
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search nations..."
              className="w-full bg-transparent text-[13px] px-3 py-1.5 outline-none font-mono"
              style={{ color: 'var(--text)', borderBottom: `1px solid color-mix(in srgb, ${primary} 30%, transparent)` }}
            />
          </div>
          {/* Groups */}
          {Object.entries(grouped).map(([grp, teams]) => (
            <div key={grp}>
              <div className="px-3 py-1 font-mono text-[9px] uppercase tracking-widest"
                style={{ background: 'var(--dark)', color: 'var(--muted)' }}>
                Group {grp}
              </div>
              {teams.map(t => (
                <button
                  key={t.name}
                  onClick={() => { onSelect(t); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${primary} 10%, transparent)`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span className="text-lg">{t.flag}</span>
                  <div>
                    <div className="font-sans text-[13px]" style={{ color: 'var(--text)' }}>{t.name}</div>
                    <div className="font-mono text-[9px]" style={{ color: 'var(--muted)' }}>{t.confederation}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
              No nations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// AI Analysis Panel
function AIAnalysisPanel({
  teamName,
  primary,
}: {
  teamName: string;
  primary: string;
}) {
  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const prevTeam = useRef('');

  // Reset when team changes
  useEffect(() => {
    if (prevTeam.current !== teamName) {
      setAiText('');
      setDone(false);
      prevTeam.current = teamName;
    }
  }, [teamName]);

  const generate = useCallback(async () => {
    setAiText('');
    setDone(false);
    setLoading(true);
    try {
      const resp = await fetch(`${API}/intel/ai-analysis/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName }),
      });
      if (!resp.ok || !resp.body) throw new Error('Stream failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n')) {
          const trimmed = line.replace(/^data:\s*/, '').trim();
          if (!trimmed || trimmed === '[DONE]') {
            if (trimmed === '[DONE]') setDone(true);
            continue;
          }
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.text) setAiText(prev => prev + parsed.text);
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setAiText('Analysis unavailable. Please try again.');
    } finally {
      setLoading(false);
      setDone(true);
    }
  }, [teamName]);

  return (
    <div className="border overflow-hidden"
      style={{
        background: `color-mix(in srgb, ${primary} 4%, var(--dark3))`,
        borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: `color-mix(in srgb, ${primary} 15%, transparent)` }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5"
            style={{
              background: `color-mix(in srgb, ${primary} 15%, transparent)`,
              color: primary,
              border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`,
            }}>
            AI Scout
          </span>
          <span className="font-sans text-[13px]" style={{ color: 'var(--muted)' }}>
            Tactical Dossier · Powered by Groq
          </span>
        </div>
        {(done || aiText) && (
          <button
            onClick={generate}
            disabled={loading}
            className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-all"
            style={{
              borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
              color: 'var(--muted)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = primary)}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            ↺ Regenerate
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {!aiText && !loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="text-4xl">🔍</div>
            <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              AI tactical analysis ready
            </p>
            <button
              onClick={generate}
              className="font-display font-semibold px-8 py-3 uppercase tracking-widest transition-all hover:-translate-y-0.5"
              style={{
                fontSize: '14px',
                background: primary,
                color: 'var(--dark)',
                boxShadow: `0 0 24px color-mix(in srgb, ${primary} 35%, transparent)`,
              }}>
              Generate Scout Report
            </button>
          </div>
        )}

        {loading && !aiText && (
          <div className="flex items-center gap-3 py-6">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: primary, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Analysing {teamName}...
            </span>
          </div>
        )}

        {aiText && (
          <div className="flex flex-col gap-1">
            {renderAIBlock(aiText, primary)}
            {loading && (
              <div className="flex gap-1 mt-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: primary, animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Player Card
function PlayerCard({ player, primary }: { player: Player; primary: string }) {
  const posColor = POS_COLORS[player.position] ?? primary;
  return (
    <div className="flex items-center gap-3 p-3 border transition-all hover:-translate-y-0.5 duration-200"
      style={{
        background: 'var(--dark3)',
        borderColor: `color-mix(in srgb, ${primary} 10%, transparent)`,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 30%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 10%, transparent)`)}>
      <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 font-mono text-[13px] font-bold"
        style={{
          background: `color-mix(in srgb, ${posColor} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${posColor} 25%, transparent)`,
          color: posColor,
        }}>
        {player.number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>
          {player.name}
        </div>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 flex-shrink-0"
        style={{
          background: `color-mix(in srgb, ${posColor} 12%, transparent)`,
          color: posColor,
          border: `1px solid color-mix(in srgb, ${posColor} 20%, transparent)`,
        }}>
        {player.position}
      </div>
    </div>
  );
}

// Fixture Row
function FixtureRow({
  fixture,
  primary,
  viewTeam,
  onPredict,
}: {
  fixture: Fixture;
  primary: string;
  viewTeam: string;
  onPredict: (f: Fixture) => void;
}) {
  const isHome = fixture.home_team.toLowerCase() === viewTeam.toLowerCase();
  const isAway = fixture.away_team.toLowerCase() === viewTeam.toLowerCase();
  const highlighted = isHome || isAway;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border transition-all duration-200"
      style={{
        background: highlighted ? `color-mix(in srgb, ${primary} 6%, var(--dark3))` : 'var(--dark3)',
        borderColor: highlighted
          ? `color-mix(in srgb, ${primary} 25%, transparent)`
          : `color-mix(in srgb, ${primary} 8%, transparent)`,
      }}>
      {/* MD badge */}
      <div className="font-mono text-[9px] uppercase tracking-widest w-8 text-center flex-shrink-0"
        style={{ color: 'var(--muted)' }}>
        MD{fixture.matchday}
      </div>

      {/* Home */}
      <div className={`flex items-center gap-2 flex-1 justify-end ${isHome ? 'font-bold' : ''}`}>
        <span className="font-sans text-[13px] text-right" style={{ color: isHome ? primary : 'var(--text)' }}>
          {fixture.home_team}
        </span>
        <span className="text-xl flex-shrink-0">{fixture.home_flag}</span>
      </div>

      {/* VS */}
      <div className="font-mono text-[11px] w-8 text-center flex-shrink-0" style={{ color: 'var(--muted)' }}>
        vs
      </div>

      {/* Away */}
      <div className={`flex items-center gap-2 flex-1 ${isAway ? 'font-bold' : ''}`}>
        <span className="text-xl flex-shrink-0">{fixture.away_flag}</span>
        <span className="font-sans text-[13px]" style={{ color: isAway ? primary : 'var(--text)' }}>
          {fixture.away_team}
        </span>
      </div>

      {/* Date + venue */}
      <div className="hidden md:block text-right flex-shrink-0" style={{ minWidth: '130px' }}>
        <div className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
          {formatKickoff(fixture.kickoff)}
        </div>
        <div className="font-mono text-[9px] truncate" style={{ color: 'var(--muted)', maxWidth: '130px' }}>
          {fixture.venue.split(',')[0]}
        </div>
      </div>

      {/* Predict CTA */}
      <button
        onClick={() => onPredict(fixture)}
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border flex-shrink-0 transition-all hover:-translate-y-0.5"
        style={{
          borderColor: `color-mix(in srgb, ${primary} 25%, transparent)`,
          color: primary,
          background: `color-mix(in srgb, ${primary} 8%, transparent)`,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${primary} 18%, transparent)`)}
        onMouseLeave={e => (e.currentTarget.style.background = `color-mix(in srgb, ${primary} 8%, transparent)`)}>
        Predict →
      </button>
    </div>
  );
}

// Standings Table
function StandingsTable({ standings, primary, viewTeam }: { standings: Standing[]; primary: string; viewTeam: string }) {
  return (
    <div className="border overflow-hidden" style={{ borderColor: `color-mix(in srgb, ${primary} 15%, transparent)` }}>
      <div className="grid font-mono text-[9px] uppercase tracking-widest px-4 py-2"
        style={{
          background: `color-mix(in srgb, ${primary} 8%, var(--dark))`,
          gridTemplateColumns: '1fr 40px 40px 40px 40px 40px 40px 40px 50px',
          color: 'var(--muted)',
        }}>
        <span>Team</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">D</span>
        <span className="text-center">L</span>
        <span className="text-center">GF</span>
        <span className="text-center">GA</span>
        <span className="text-center">GD</span>
        <span className="text-center">Pts</span>
      </div>
      {standings.map((s, i) => {
        const isView = s.team.toLowerCase() === viewTeam.toLowerCase();
        return (
          <div
            key={s.team}
            className="grid items-center px-4 py-2.5 border-t"
            style={{
              borderColor: `color-mix(in srgb, ${primary} 8%, transparent)`,
              background: isView ? `color-mix(in srgb, ${primary} 6%, var(--dark3))` : 'transparent',
              gridTemplateColumns: '1fr 40px 40px 40px 40px 40px 40px 40px 50px',
            }}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] w-5 text-center" style={{ color: 'var(--muted)' }}>{i + 1}</span>
              <span className="text-base">{s.flag}</span>
              <span className="font-sans text-[13px]" style={{ color: isView ? primary : 'var(--text)', fontWeight: isView ? 700 : 400 }}>
                {s.team}
              </span>
            </div>
            {[s.played, s.won, s.drawn, s.lost, s.gf, s.ga, s.gd, s.points].map((v, j) => (
              <span key={j} className="font-mono text-[12px] text-center"
                style={{ color: j === 7 ? primary : 'var(--muted)', fontWeight: j === 7 ? 700 : 400 }}>
                {v}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Article Panel (drawer)
function ArticlePanel({
  article,
  onClose,
  primary,
}: {
  article: Article | null;
  onClose: () => void;
  primary: string;
}) {
  if (!article) return null;
  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn        { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(560px, 100vw)',
          background: 'var(--dark)',
          borderLeft: `1px solid color-mix(in srgb, ${primary} 20%, transparent)`,
          boxShadow: `-20px 0 60px rgba(0,0,0,0.5)`,
          animation: 'slideInRight 0.3s ease',
        }}>
        <div className="h-[2px] flex-shrink-0" style={{ background: `linear-gradient(90deg, ${primary}, transparent)` }} />
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5"
              style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}>
              {article.source || 'Guardian'}
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{timeAgo(article.published)}</span>
          </div>
          <button onClick={onClose} className="font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-all"
            style={{ borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`, color: 'var(--muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = primary)}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            ✕ Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {article.thumbnail && (
            <div className="w-full h-64 overflow-hidden">
              <img src={article.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="px-6 py-6 flex flex-col gap-5">
            <h2 className="font-display font-semibold leading-tight" style={{ fontSize: 'clamp(22px, 3vw, 28px)', letterSpacing: '-0.5px' }}>
              {article.title}
            </h2>
            {article.byline && (
              <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color: primary }}>By {article.byline}</p>
            )}
            <div className="h-px" style={{ background: `color-mix(in srgb, ${primary} 15%, transparent)` }} />
            {article.trail ? (
              <div className="text-[14px] leading-relaxed" style={{ color: 'var(--muted)' }} dangerouslySetInnerHTML={{ __html: article.trail }} />
            ) : (
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--muted)' }}>No preview available.</p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t flex-shrink-0"
          style={{ borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`, background: 'var(--dark3)' }}>
          <a href={article.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 font-mono text-[11px] tracking-widest uppercase transition-all hover:-translate-y-0.5"
            style={{ background: primary, color: 'var(--dark)', boxShadow: `0 0 20px color-mix(in srgb, ${primary} 30%, transparent)` }}>
            Read Full Article →
          </a>
        </div>
      </div>
    </>
  );
}

// News Card
function NewsCard({ article, primary, onSelect }: { article: Article; primary: string; onSelect: (a: Article) => void }) {
  return (
    <div onClick={() => onSelect(article)}
      className="group flex flex-col overflow-hidden border transition-all hover:-translate-y-0.5 duration-200 cursor-pointer"
      style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`, position: 'relative' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 12%, transparent)`)}>
      <div className="absolute top-0 left-0 right-0 h-[2px] transition-opacity opacity-0 group-hover:opacity-100" style={{ background: primary }} />
      {article.thumbnail ? (
        <div className="h-48 overflow-hidden">
          <img src={article.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-3xl"
          style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 12%, transparent), transparent)` }}>
          📰
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="text-[var(--text)] text-[14px] font-semibold leading-snug line-clamp-2">{article.title}</p>
        {article.trail && (
          <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--muted)' }} dangerouslySetInnerHTML={{ __html: article.trail }} />
        )}
        <div className="mt-auto flex items-center justify-between pt-2 border-t"
          style={{ borderColor: `color-mix(in srgb, ${primary} 8%, transparent)` }}>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5"
            style={{ background: `color-mix(in srgb, ${primary} 10%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 20%, transparent)` }}>
            {article.source || 'Guardian'}
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>{timeAgo(article.published)}</span>
        </div>
      </div>
    </div>
  );
}

// Reddit Card
function RedditCard({ post, primary }: { post: RedditPost; primary: string }) {
  return (
    <a href={post.url} target="_blank" rel="noopener noreferrer"
      className="group flex gap-3 p-5 border transition-all hover:-translate-y-0.5 duration-200"
      style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 12%, transparent)`, position: 'relative', overflow: 'hidden' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 12%, transparent)`)}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity opacity-0 group-hover:opacity-100" style={{ background: primary }} />
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-12 pt-0.5">
        <span className="text-xs" style={{ color: primary }}>▲</span>
        <span className="font-display font-semibold text-2xl leading-none" style={{ color: primary }}>{formatScore(post.score)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text)] text-sm font-semibold leading-snug line-clamp-2">{post.title}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-mono text-[11px] font-semibold tracking-widest uppercase px-2 py-0.5"
            style={{ background: `color-mix(in srgb, ${primary} 15%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}>
            {post.subreddit}
          </span>
          <span className="font-mono text-[11px] ml-auto" style={{ color: 'var(--muted)' }}>💬 {formatScore(post.comments)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>u/{post.author}</span>
          <span style={{ color: 'var(--muted)' }}>·</span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{timeAgo(post.created)}</span>
        </div>
      </div>
    </a>
  );
}

// Video Card
function VideoCard({ video, primary }: { video: Video; primary: string }) {
  return (
    <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
      className="group flex-shrink-0 w-72 border overflow-hidden transition-all hover:-translate-y-0.5 duration-200"
      style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 12%, transparent)`)}>
      <div className="relative h-44 overflow-hidden" style={{ background: 'var(--border)' }}>
        {video.thumbnail && <img src={video.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
        <div className="absolute top-2 left-2 font-mono text-[9px] tracking-wider uppercase px-2 py-0.5" style={{ background: 'rgba(0,0,0,0.75)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
          {video.channel.slice(0, 12)}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{ background: 'rgba(0,0,0,0.65)', border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)`, boxShadow: `0 0 20px color-mix(in srgb, ${primary} 40%, transparent)` }}>
            <span className="text-white text-lg ml-0.5">▶</span>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-[var(--text)] text-[13px] font-semibold leading-snug line-clamp-2">{video.title}</p>
        <p className="font-mono text-[11px] mt-1 truncate" style={{ color: primary }}>{video.channel}</p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{timeAgo(video.published)}</p>
      </div>
    </a>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

type TabId = 'overview' | 'squad' | 'fixtures' | 'news' | 'community' | 'videos';

export default function NationPage() {
  const { team: userTeam, primary } = useTheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Default to user's favourite team
  const defaultTeam = userTeam
    ? WC2026_TEAMS.find(t => t.name.toLowerCase() === userTeam.name.toLowerCase()) ?? WC2026_TEAMS[12] // Brazil
    : WC2026_TEAMS[12];

  const [viewTeam, setViewTeam] = useState<WCTeamMeta>(defaultTeam);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Data
  const [squad,     setSquad]     = useState<Player[]>([]);
  const [fixtures,  setFixtures]  = useState<Fixture[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [groupKey,  setGroupKey]  = useState<string>('');
  const [news,      setNews]      = useState<Article[]>([]);
  const [moreNews,  setMoreNews]  = useState<Article[]>([]);
  const [reddit,    setReddit]    = useState<RedditPost[]>([]);
  const [videos,    setVideos]    = useState<Video[]>([]);
  const [loading,   setLoading]   = useState({ squad: false, fixtures: false, news: false, reddit: false, videos: false });

  // Squad browser
  const [posFilter,    setPosFilter]    = useState<string>('ALL');
  const [playerSearch, setPlayerSearch] = useState<string>('');

  // Article drawer
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedArticle(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedArticle ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedArticle]);

  // Fetch all data when viewTeam changes
  const fetchAll = useCallback(async () => {
    const name = viewTeam.name;
    setSquad([]); setFixtures([]); setStandings([]); setGroupKey('');
    setNews([]); setMoreNews([]); setReddit([]); setVideos([]);
    setLoading({ squad: true, fixtures: true, news: true, reddit: true, videos: true });

    await Promise.allSettled([
      fetch(`${API}/intel/squad/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => setSquad(d.squad ?? []))
        .finally(() => setLoading(p => ({ ...p, squad: false }))),

      fetch(`${API}/intel/fixtures/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => { setFixtures(d.fixtures ?? []); setStandings(d.standings ?? []); setGroupKey(d.group ?? ''); })
        .finally(() => setLoading(p => ({ ...p, fixtures: false }))),

      fetch(`${API}/intel/news/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => setNews(d.articles ?? []))
        .finally(() => setLoading(p => ({ ...p, news: false }))),

      fetch(`${API}/intel/more-news/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => setMoreNews(d.articles ?? [])),

      fetch(`${API}/intel/reddit/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => setReddit(d.posts ?? []))
        .finally(() => setLoading(p => ({ ...p, reddit: false }))),

      fetch(`${API}/intel/videos/${encodeURIComponent(name)}`)
        .then(r => r.json())
        .then(d => setVideos(d.videos ?? []))
        .finally(() => setLoading(p => ({ ...p, videos: false }))),
    ]);
  }, [viewTeam]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchAll();
    setActiveTab('overview');
    setPosFilter('ALL');
    setPlayerSearch('');
  }, [user, isLoading, fetchAll, router]);

  // Reset tab on team switch
  const handleTeamSelect = (t: WCTeamMeta) => {
    setViewTeam(t);
    setActiveTab('overview');
  };

  if (isLoading || !user) return null;

  // Filtered squad
  const filteredSquad = squad.filter(p => {
    const matchPos = posFilter === 'ALL' || (POS_FILTER_GROUPS[posFilter]?.includes(p.position));
    const matchSearch = playerSearch === '' || p.name.toLowerCase().includes(playerSearch.toLowerCase());
    return matchPos && matchSearch;
  });

  // Next fixture for this team
  const nextFixtures = fixtures
    .filter(f => new Date(f.kickoff) > new Date())
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .slice(0, 2);

  const handlePredict = (f: Fixture) => {
    router.push(`/predict?match=${f.id}&team=${encodeURIComponent(f.home_team)}&away=${encodeURIComponent(f.away_team)}`);
  };

  const TABS: { id: TabId; label: string; icon: string; count?: number }[] = [
    { id: 'overview',   label: 'Overview',   icon: '🔍' },
    { id: 'squad',      label: 'Squad',      icon: '👥', count: squad.length },
    { id: 'fixtures',   label: 'Fixtures',   icon: '🗓️', count: fixtures.length },
    { id: 'news',       label: 'Dispatches', icon: '📡', count: news.length + moreNews.length },
    { id: 'community',  label: 'Community',  icon: '🔥', count: reddit.length },
    { id: 'videos',     label: 'Highlights', icon: '🎬', count: videos.length },
  ];

  return (
    <div className="min-h-screen bg-[var(--dark)] text-[var(--text)]">
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn        { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <NavBar subtitle="NATION INTEL" />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 10%, var(--dark)) 0%, var(--dark) 65%)` }}>

        <div className="absolute inset-0 flex items-center justify-end pr-16 opacity-[0.06] pointer-events-none select-none" aria-hidden>
          <span className="text-[240px] blur-[2px]">{viewTeam.flag}</span>
        </div>
        <div className="grid-bg opacity-25" />
        <div className="absolute bottom-0 right-0 font-display font-semibold leading-none select-none pointer-events-none hidden lg:block"
          style={{ fontSize: '200px', color: primary, opacity: 0.025, letterSpacing: '-4px', lineHeight: 1 }}>
          {viewTeam.name.toUpperCase()}
        </div>

        <div className="relative max-w-[1200px] mx-auto px-7 pt-8 pb-10 z-10">
          {/* Top row: nav + team selector */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <button onClick={() => router.push('/')}
              className="font-mono text-[11px] tracking-widest uppercase transition-colors"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = primary)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              ← Hub
            </button>

            <div className="flex items-center gap-3">
              <TeamSelector selected={viewTeam} onSelect={handleTeamSelect} primary={primary} />
              <button onClick={fetchAll}
                className="font-mono text-[11px] tracking-widest uppercase px-3 py-2 border transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--dark3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = primary)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                ↺
              </button>
            </div>
          </div>

          {/* Nation identity */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-5xl sm:text-6xl flex-shrink-0 border-2"
              style={{
                background: `color-mix(in srgb, ${primary} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${primary} 30%, transparent)`,
              }}>
              {viewTeam.flag}
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase mb-2"
                style={{
                  background: `color-mix(in srgb, ${primary} 12%, transparent)`,
                  color: primary,
                  border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`,
                }}>
                <span>Group {viewTeam.group}</span>
                <span className="opacity-40">·</span>
                <span>{viewTeam.confederation}</span>
                <span className="opacity-40">·</span>
                <span>WC 2026</span>
              </div>

              <h1 className="font-display font-semibold leading-none uppercase"
                style={{
                  fontSize: 'clamp(48px, 10vw, 112px)',
                  color: primary,
                  letterSpacing: '-1px',
                  lineHeight: '0.9',
                }}>
                {viewTeam.name}
              </h1>

              <div className="flex items-center gap-4 mt-3">
                <button
                  onClick={() => router.push(`/predict?team=${encodeURIComponent(viewTeam.name)}`)}
                  className="font-mono text-[11px] uppercase tracking-widest px-4 py-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: primary,
                    color: 'var(--dark)',
                    fontWeight: 600,
                    boxShadow: `0 0 20px color-mix(in srgb, ${primary} 30%, transparent)`,
                  }}>
                  Predict {viewTeam.name} →
                </button>
                {groupKey && (
                  <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    Group {groupKey} · {squad.length > 0 ? `${squad.length} players` : 'Loading squad...'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 h-[2px]"
            style={{ background: `linear-gradient(90deg, ${primary}, ${primary}30, transparent)` }} />
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <div className="border-b" style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 12%, transparent)` }}>
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="flex items-center gap-8 py-3 overflow-x-auto">
            {[
              { label: 'Squad Size',    value: squad.length > 0 ? String(squad.length) : '—' },
              { label: 'Group',         value: `Group ${viewTeam.group}` },
              { label: 'Confederation', value: viewTeam.confederation },
              { label: 'Group Matches', value: fixtures.length > 0 ? String(fixtures.length) : '—' },
              { label: 'News',          value: news.length > 0 ? String(news.length) : '—' },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-3 flex-shrink-0">
                <div>
                  <div className="font-display font-semibold" style={{ fontSize: '18px', color: primary, lineHeight: 1 }}>{stat.value}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted)' }}>{stat.label}</div>
                </div>
                <div className="w-px h-7 ml-2 flex-shrink-0" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b"
        style={{
          background: 'rgba(6,10,6,0.94)',
          backdropFilter: 'blur(24px)',
          borderColor: `color-mix(in srgb, ${primary} 10%, transparent)`,
        }}>
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="flex gap-px py-2.5 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-2 font-mono text-[11px] tracking-widest uppercase transition-all whitespace-nowrap"
                style={activeTab === tab.id
                  ? { color: primary, fontWeight: 600, borderBottom: `2px solid ${primary}`, background: `color-mix(in srgb, ${primary} 8%, transparent)` }
                  : { color: 'var(--muted)', borderBottom: '2px solid transparent' }}
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--muted)'; }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5"
                    style={{
                      background: `color-mix(in srgb, ${primary} 12%, transparent)`,
                      color: primary,
                      minWidth: '18px',
                      textAlign: 'center',
                    }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-7 py-10">

        {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-8">
            {/* AI Analysis */}
            <div>
              <SectionHead icon="🧠" label="AI Scout Report" sub="Tactical dossier · Groq Llama 3.3 70B" primary={primary} />
              <AIAnalysisPanel teamName={viewTeam.name} primary={primary} />
            </div>

            {/* Next fixtures + predict CTA */}
            {nextFixtures.length > 0 && (
              <div>
                <SectionHead icon="🗓️" label="Upcoming Fixtures" sub="Group stage · WC 2026" primary={primary} />
                <div className="flex flex-col gap-2">
                  {nextFixtures.map(f => (
                    <FixtureRow key={f.id} fixture={f} primary={primary} viewTeam={viewTeam.name} onPredict={handlePredict} />
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('fixtures')}
                  className="mt-3 w-full py-2.5 border font-mono text-[11px] uppercase tracking-widest transition-all hover:-translate-y-0.5"
                  style={{ borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`, color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = primary)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  View All Group Fixtures →
                </button>
              </div>
            )}

            {/* Key players strip */}
            {squad.filter(p => ['CAM', 'ST', 'LW', 'RW', 'CM'].includes(p.position)).length > 0 && (
              <div>
                <SectionHead icon="⭐" label="Key Players" sub="Attack & midfield — ones to watch" primary={primary} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {squad
                    .filter(p => ['CAM', 'ST', 'LW', 'RW', 'CM'].includes(p.position))
                    .slice(0, 8)
                    .map((p, i) => <PlayerCard key={i} player={p} primary={primary} />)}
                </div>
                <button
                  onClick={() => setActiveTab('squad')}
                  className="mt-3 w-full py-2.5 border font-mono text-[11px] uppercase tracking-widest transition-all hover:-translate-y-0.5"
                  style={{ borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`, color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = primary)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  View Full Squad →
                </button>
              </div>
            )}

            {/* Latest news preview */}
            {news.slice(0, 3).length > 0 && (
              <div>
                <SectionHead icon="📡" label="Latest Intel" sub="News · Press dispatches" primary={primary} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {news.slice(0, 3).map((a, i) => <NewsCard key={a.id ?? i} article={a} primary={primary} onSelect={setSelectedArticle} />)}
                </div>
                <button
                  onClick={() => setActiveTab('news')}
                  className="mt-3 w-full py-2.5 border font-mono text-[11px] uppercase tracking-widest transition-all hover:-translate-y-0.5"
                  style={{ borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`, color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = primary)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  All Dispatches →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SQUAD ──────────────────────────────────────────────────────── */}
        {activeTab === 'squad' && (
          <div>
            <SectionHead icon="👥" label="Full Squad" sub={`${viewTeam.name} · WC 2026 roster`} primary={primary} />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex gap-1">
                {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map(f => (
                  <button key={f} onClick={() => setPosFilter(f)}
                    className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-all"
                    style={{
                      background: posFilter === f ? primary : `color-mix(in srgb, ${primary} 8%, transparent)`,
                      color: posFilter === f ? 'var(--dark)' : 'var(--muted)',
                      borderColor: posFilter === f ? primary : `color-mix(in srgb, ${primary} 20%, transparent)`,
                      fontWeight: posFilter === f ? 700 : 400,
                    }}>
                    {f}
                  </button>
                ))}
              </div>
              <input
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                placeholder="Search player..."
                className="flex-1 min-w-[160px] max-w-xs bg-transparent border px-3 py-1.5 font-mono text-[12px] outline-none transition-all"
                style={{
                  borderColor: `color-mix(in srgb, ${primary} 20%, transparent)`,
                  color: 'var(--text)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = primary)}
                onBlur={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 20%, transparent)`)}
              />
              <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                {filteredSquad.length} players
              </span>
            </div>

            {loading.squad ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : filteredSquad.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">👤</p>
                <p className="font-mono text-xs tracking-widest">No players found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredSquad
                  .sort((a, b) => {
                    const order = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];
                    return order.indexOf(a.position) - order.indexOf(b.position) || a.number - b.number;
                  })
                  .map((p, i) => <PlayerCard key={i} player={p} primary={primary} />)}
              </div>
            )}
          </div>
        )}

        {/* ── FIXTURES ────────────────────────────────────────────────────── */}
        {activeTab === 'fixtures' && (
          <div>
            <SectionHead
              icon="🗓️"
              label={`Group ${groupKey || viewTeam.group} Fixtures`}
              sub="Group stage · WC 2026 · All 6 matches"
              primary={primary}
            />

            {loading.fixtures ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : fixtures.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">🗓️</p>
                <p className="font-mono text-xs tracking-widest">No fixtures found</p>
              </div>
            ) : (
              <>
                {/* Matchday groups */}
                {[1, 2, 3].map(md => {
                  const mdFixtures = fixtures.filter(f => f.matchday === md);
                  if (!mdFixtures.length) return null;
                  return (
                    <div key={md} className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5"
                          style={{ background: `color-mix(in srgb, ${primary} 10%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 20%, transparent)` }}>
                          Matchday {md}
                        </span>
                        <div className="h-px flex-1" style={{ background: `color-mix(in srgb, ${primary} 10%, transparent)` }} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {mdFixtures.map(f => (
                          <FixtureRow key={f.id} fixture={f} primary={primary} viewTeam={viewTeam.name} onPredict={handlePredict} />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Standings */}
                {standings.length > 0 && (
                  <div className="mt-8">
                    <SectionHead icon="📊" label="Group Standings" sub="Current table · Points / GD" primary={primary} />
                    <StandingsTable standings={standings} primary={primary} viewTeam={viewTeam.name} />
                    <p className="font-mono text-[9px] uppercase tracking-widest mt-3 text-center" style={{ color: 'var(--muted)' }}>
                      Standings update as matches are played · Group stage runs June 11–27, 2026
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── NEWS ────────────────────────────────────────────────────────── */}
        {activeTab === 'news' && (
          <div>
            <SectionHead icon="📡" label="Latest Dispatches" sub="Guardian · BBC · Sky Sports · ESPN" primary={primary} />
            {loading.news ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border" style={{ borderColor: 'var(--border)', background: 'var(--dark3)' }}>
                    <Skeleton className="h-36" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">📭</p>
                <p className="font-mono text-xs tracking-widest">No dispatches found for {viewTeam.name}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {news.map((a, i) => <NewsCard key={a.id ?? i} article={a} primary={primary} onSelect={setSelectedArticle} />)}
                </div>
                {moreNews.length > 0 && (
                  <div className="mt-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1" style={{ background: `color-mix(in srgb, ${primary} 15%, transparent)` }} />
                      <span className="font-mono text-[10px] uppercase tracking-[4px]" style={{ color: 'var(--muted)' }}>More Sources</span>
                      <div className="h-px flex-1" style={{ background: `color-mix(in srgb, ${primary} 15%, transparent)` }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {moreNews.map((a, i) => <NewsCard key={i} article={a} primary={primary} onSelect={setSelectedArticle} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── COMMUNITY ───────────────────────────────────────────────────── */}
        {activeTab === 'community' && (
          <div>
            <SectionHead icon="🔥" label="Community Pulse" sub="r/soccer · r/worldcup · trending now" primary={primary} />
            {loading.reddit ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-4 border" style={{ borderColor: 'var(--border)', background: 'var(--dark3)' }}>
                    <Skeleton className="w-10 h-12 flex-shrink-0" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
                  </div>
                ))}
              </div>
            ) : reddit.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">🔇</p>
                <p className="font-mono text-xs tracking-widest">No trending posts found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {reddit.map(post => <RedditCard key={post.id} post={post} primary={primary} />)}
                <a href={`https://www.reddit.com/r/soccer/search/?q=${encodeURIComponent(viewTeam.name)}&sort=hot`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-center py-4 border font-mono text-[11px] tracking-widest uppercase transition-all hover:-translate-y-0.5"
                  style={{ borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`, color: 'var(--muted)', background: 'var(--dark3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = primary)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  View more on Reddit →
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── VIDEOS ──────────────────────────────────────────────────────── */}
        {activeTab === 'videos' && (
          <div>
            <SectionHead icon="🎬" label="Highlights & Clips" sub="YouTube · latest footage" primary={primary} />
            {loading.videos ? (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-56 border" style={{ borderColor: 'var(--border)', background: 'var(--dark3)' }}>
                    <Skeleton className="h-32" />
                    <div className="p-3 space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
                <p className="text-4xl mb-3">📹</p>
                <p className="font-mono text-xs tracking-widest">No videos found · Add YouTube API key to enable</p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-7 px-7 snap-x snap-mandatory">
                {videos.map(v => (
                  <div key={v.id} className="snap-start"><VideoCard video={v} primary={primary} /></div>
                ))}
              </div>
            )}
            {reddit.length > 0 && (
              <div className="mt-10">
                <SectionHead icon="💬" label="Fan Reactions" sub="Hottest community posts this week" primary={primary} />
                <div className="flex flex-col gap-2">
                  {reddit.slice(0, 4).map(post => <RedditCard key={post.id} post={post} primary={primary} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── STICKY PREDICT CTA ──────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t"
        style={{
          background: 'rgba(6,10,6,0.92)',
          backdropFilter: 'blur(24px)',
          borderColor: `color-mix(in srgb, ${primary} 15%, transparent)`,
        }}>
        <div className="max-w-[1200px] mx-auto px-7 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{viewTeam.flag}</span>
            <div className="min-w-0">
              <div className="font-display font-semibold text-[14px] truncate" style={{ color: 'var(--text)' }}>
                {viewTeam.name}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Group {viewTeam.group} · {viewTeam.confederation}
              </div>
            </div>
          </div>

          {nextFixtures[0] && (
            <div className="hidden sm:block text-center flex-shrink-0">
              <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Next match</div>
              <div className="font-sans text-[12px]" style={{ color: 'var(--text)' }}>
                {nextFixtures[0].home_flag} {nextFixtures[0].home_team} vs {nextFixtures[0].away_team} {nextFixtures[0].away_flag}
              </div>
            </div>
          )}

          <button
            onClick={() => nextFixtures[0]
              ? handlePredict(nextFixtures[0])
              : router.push(`/predict?team=${encodeURIComponent(viewTeam.name)}`)}
            className="font-display font-semibold px-6 py-2.5 uppercase tracking-widest transition-all hover:-translate-y-0.5 flex-shrink-0"
            style={{
              fontSize: '13px',
              background: primary,
              color: 'var(--dark)',
              boxShadow: `0 0 20px color-mix(in srgb, ${primary} 35%, transparent)`,
            }}>
            Predict →
          </button>
        </div>
      </div>

      {/* Spacing for sticky bar */}
      <div className="h-20" />

      <ArticlePanel article={selectedArticle} onClose={() => setSelectedArticle(null)} primary={primary} />
    </div>
  );
}
