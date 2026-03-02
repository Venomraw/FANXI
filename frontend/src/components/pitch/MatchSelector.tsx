'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '@/src/context/ThemeContext';

export interface WCMatch {
  id: number;
  home_team: string;
  home_flag: string;
  away_team: string;
  away_flag: string;
  kickoff: string;
  venue: string;
  round: string;
}

interface Props {
  selectedId: number | null;
  onSelect: (match: WCMatch) => void;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function MatchSelector({ selectedId, onSelect }: Props) {
  const { primary } = useTheme();
  const [matches, setMatches] = useState<WCMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/matches/upcoming')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setMatches(list);
        if (list.length > 0 && selectedId === null) onSelect(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-44 h-24 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.05)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
      {matches.map(m => {
        const active = selectedId === m.id;
        return (
          <button key={m.id}
            onClick={() => onSelect(m)}
            className="flex-shrink-0 w-48 text-left p-4 border transition-all duration-200 relative overflow-hidden group"
            style={{
              background: active ? `${primary}12` : 'rgba(255,255,255,0.03)',
              borderColor: active ? primary : 'rgba(255,255,255,0.1)',
              outline: 'none',
            }}>

            {/* Active top line */}
            {active && (
              <div className="absolute top-0 left-0 right-0 h-0.5 theme-transition"
                style={{ background: primary }} />
            )}

            {/* Round */}
            <p className="font-mono text-[10px] tracking-[2px] uppercase mb-3 truncate theme-transition"
              style={{ color: active ? primary : 'rgba(255,255,255,0.3)' }}>
              {m.round}
            </p>

            {/* Teams row */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-2xl leading-none">{m.home_flag}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-center w-full truncate"
                  style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {m.home_team.length > 6 ? m.home_team.slice(0,6) + '.' : m.home_team}
                </span>
              </div>

              <span className="font-display text-xl px-1 flex-shrink-0 theme-transition"
                style={{ color: active ? primary : 'rgba(255,255,255,0.2)' }}>
                vs
              </span>

              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-2xl leading-none">{m.away_flag}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-center w-full truncate"
                  style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {m.away_team.length > 6 ? m.away_team.slice(0,6) + '.' : m.away_team}
                </span>
              </div>
            </div>

            {/* Date/time */}
            <p className="font-mono text-[10px] mt-3 text-center theme-transition"
              style={{ color: active ? `${primary}aa` : 'rgba(255,255,255,0.25)' }}>
              {fmtDate(m.kickoff)} · {fmtTime(m.kickoff)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
