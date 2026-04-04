'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import {
  WC2026_GROUPS,
  GROUP_KEYS,
  getTeamInfo,
  R32_BRACKET,
} from '@/src/data/wc2026Groups';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupPick {
  first: string | null;
  second: string | null;
}

interface BracketState {
  groups: Record<string, GroupPick>;
  thirdPlaceAdvancing: string[];
  r32: Record<string, string | null>;
  r16: Record<string, string | null>;
  qf: Record<string, string | null>;
  sf: Record<string, string | null>;
  final: string | null;
}

interface CommunityStats {
  total_submissions: number;
  champion_votes: Record<string, number>;
  most_picked_champion: string | null;
  most_picked_finalist: string | null;
}

const STORAGE_KEY = 'fanxi_wc2026_bracket';
const STEPS = ['Group Stage', 'Round of 32', 'Knockouts', 'The Final'] as const;

function emptyBracket(): BracketState {
  const groups: Record<string, GroupPick> = {};
  for (const k of GROUP_KEYS) groups[k] = { first: null, second: null };
  return {
    groups,
    thirdPlaceAdvancing: [],
    r32: {},
    r16: {},
    qf: {},
    sf: {},
    final: null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('fanxi_sim_session');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('fanxi_sim_session', id);
  }
  return id;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimulatorPage() {
  const [step, setStep] = useState(0);
  const [bracket, setBracket] = useState<BracketState>(emptyBracket);
  const [restored, setRestored] = useState(false);
  const [community, setCommunity] = useState<CommunityStats | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BracketState;
        setBracket(parsed);
      }
    } catch { /* ignore */ }
    setRestored(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bracket));
  }, [bracket, restored]);

  // Fetch community stats
  useEffect(() => {
    fetch(`${API}/simulator/community`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setCommunity(d))
      .catch(() => {});
  }, [bracket.final]);

  // -------------------------------------------
  // Group stage logic
  // -------------------------------------------
  const groupsComplete = useMemo(() => {
    return GROUP_KEYS.every(k => bracket.groups[k]?.first && bracket.groups[k]?.second);
  }, [bracket.groups]);

  const completedGroupCount = useMemo(() => {
    return GROUP_KEYS.filter(k => bracket.groups[k]?.first && bracket.groups[k]?.second).length;
  }, [bracket.groups]);

  const pickGroup = useCallback((group: string, team: string, position: '1st' | '2nd') => {
    setBracket(prev => {
      const cur = { ...prev.groups[group] };
      if (position === '1st') {
        cur.first = cur.first === team ? null : team;
        if (cur.second === team) cur.second = null;
      } else {
        cur.second = cur.second === team ? null : team;
        if (cur.first === team) cur.first = null;
      }
      return { ...prev, groups: { ...prev.groups, [group]: cur } };
    });
  }, []);

  // -------------------------------------------
  // 3rd-place teams
  // -------------------------------------------
  const thirdPlaceTeams = useMemo(() => {
    const thirds: string[] = [];
    for (const k of GROUP_KEYS) {
      const gp = bracket.groups[k];
      if (!gp.first || !gp.second) continue;
      const groupTeams = WC2026_GROUPS[k].teams;
      const remaining = groupTeams.filter(t => t !== gp.first && t !== gp.second);
      if (remaining.length > 0) thirds.push(remaining[0]);
    }
    return thirds;
  }, [bracket.groups]);

  const toggleThirdPlace = useCallback((team: string) => {
    setBracket(prev => {
      const cur = [...prev.thirdPlaceAdvancing];
      const idx = cur.indexOf(team);
      if (idx >= 0) {
        cur.splice(idx, 1);
      } else if (cur.length < 8) {
        cur.push(team);
      }
      return { ...prev, thirdPlaceAdvancing: cur };
    });
  }, []);

  // -------------------------------------------
  // R32 match resolution
  // -------------------------------------------
  const r32Matchups = useMemo(() => {
    if (!groupsComplete || bracket.thirdPlaceAdvancing.length !== 8) return [];

    // Assign 3rd-place teams to R32 slots in order
    let thirdIdx = 0;
    return R32_BRACKET.map(slot => {
      let teamA: string | null = null;
      let teamB: string | null = null;

      if (slot.sourceA.type === 'group') {
        const gp = bracket.groups[slot.sourceA.group];
        teamA = slot.sourceA.position === '1st' ? gp.first : gp.second;
      } else {
        teamA = bracket.thirdPlaceAdvancing[thirdIdx++] ?? null;
      }

      if (slot.sourceB.type === 'group') {
        const gp = bracket.groups[slot.sourceB.group];
        teamB = slot.sourceB.position === '1st' ? gp.first : gp.second;
      } else {
        teamB = bracket.thirdPlaceAdvancing[thirdIdx++] ?? null;
      }

      return { id: slot.id, label: slot.label, teamA, teamB };
    });
  }, [groupsComplete, bracket.groups, bracket.thirdPlaceAdvancing]);

  const pickR32 = useCallback((matchId: string, winner: string) => {
    setBracket(prev => ({
      ...prev,
      r32: { ...prev.r32, [matchId]: prev.r32[matchId] === winner ? null : winner },
    }));
  }, []);

  const r32Complete = useMemo(() => {
    return r32Matchups.length === 16 && r32Matchups.every(m => bracket.r32[m.id]);
  }, [r32Matchups, bracket.r32]);

  // -------------------------------------------
  // R16 matchups (winners of adjacent R32 pairs)
  // -------------------------------------------
  const r16Matchups = useMemo(() => {
    if (!r32Complete) return [];
    const matches: { id: string; label: string; teamA: string | null; teamB: string | null }[] = [];
    for (let i = 0; i < 16; i += 2) {
      const a = bracket.r32[r32Matchups[i].id] ?? null;
      const b = bracket.r32[r32Matchups[i + 1].id] ?? null;
      matches.push({ id: `r16_${i / 2 + 1}`, label: `R16-${i / 2 + 1}`, teamA: a, teamB: b });
    }
    return matches;
  }, [r32Complete, bracket.r32, r32Matchups]);

  const pickR16 = useCallback((matchId: string, winner: string) => {
    setBracket(prev => ({
      ...prev,
      r16: { ...prev.r16, [matchId]: prev.r16[matchId] === winner ? null : winner },
    }));
  }, []);

  const r16Complete = useMemo(() => {
    return r16Matchups.length === 8 && r16Matchups.every(m => bracket.r16[m.id]);
  }, [r16Matchups, bracket.r16]);

  // QF
  const qfMatchups = useMemo(() => {
    if (!r16Complete) return [];
    const matches: { id: string; label: string; teamA: string | null; teamB: string | null }[] = [];
    for (let i = 0; i < 8; i += 2) {
      const a = bracket.r16[r16Matchups[i].id] ?? null;
      const b = bracket.r16[r16Matchups[i + 1].id] ?? null;
      matches.push({ id: `qf_${i / 2 + 1}`, label: `QF-${i / 2 + 1}`, teamA: a, teamB: b });
    }
    return matches;
  }, [r16Complete, bracket.r16, r16Matchups]);

  const pickQF = useCallback((matchId: string, winner: string) => {
    setBracket(prev => ({
      ...prev,
      qf: { ...prev.qf, [matchId]: prev.qf[matchId] === winner ? null : winner },
    }));
  }, []);

  const qfComplete = useMemo(() => {
    return qfMatchups.length === 4 && qfMatchups.every(m => bracket.qf[m.id]);
  }, [qfMatchups, bracket.qf]);

  // SF
  const sfMatchups = useMemo(() => {
    if (!qfComplete) return [];
    const matches: { id: string; label: string; teamA: string | null; teamB: string | null }[] = [];
    for (let i = 0; i < 4; i += 2) {
      const a = bracket.qf[qfMatchups[i].id] ?? null;
      const b = bracket.qf[qfMatchups[i + 1].id] ?? null;
      matches.push({ id: `sf_${i / 2 + 1}`, label: `SF-${i / 2 + 1}`, teamA: a, teamB: b });
    }
    return matches;
  }, [qfComplete, bracket.qf, qfMatchups]);

  const pickSF = useCallback((matchId: string, winner: string) => {
    setBracket(prev => ({
      ...prev,
      sf: { ...prev.sf, [matchId]: prev.sf[matchId] === winner ? null : winner },
    }));
  }, []);

  const sfComplete = useMemo(() => {
    return sfMatchups.length === 2 && sfMatchups.every(m => bracket.sf[m.id]);
  }, [sfMatchups, bracket.sf]);

  // Final teams
  const finalTeams = useMemo(() => {
    if (!sfComplete) return { teamA: null as string | null, teamB: null as string | null };
    return {
      teamA: bracket.sf[sfMatchups[0].id] ?? null,
      teamB: bracket.sf[sfMatchups[1].id] ?? null,
    };
  }, [sfComplete, bracket.sf, sfMatchups]);

  const pickChampion = useCallback((team: string) => {
    setBracket(prev => {
      const newVal = prev.final === team ? null : team;
      return { ...prev, final: newVal };
    });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);

    // Submit to backend
    const finalist =
      team === finalTeams.teamA ? finalTeams.teamB : finalTeams.teamA;
    const semis = sfMatchups.map(m => bracket.sf[m.id]).filter(Boolean) as string[];
    fetch(`${API}/simulator/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        champion: team,
        finalist: finalist ?? '',
        semi_finalists: semis.slice(0, 2),
      }),
    }).catch(() => {});
  }, [finalTeams, sfMatchups, bracket.sf]);

  // -------------------------------------------
  // Step validation
  // -------------------------------------------
  const canAdvance = useMemo(() => {
    switch (step) {
      case 0: return groupsComplete;
      case 1: return bracket.thirdPlaceAdvancing.length === 8 && r32Complete;
      case 2: return sfComplete;
      case 3: return !!bracket.final;
      default: return false;
    }
  }, [step, groupsComplete, bracket.thirdPlaceAdvancing, r32Complete, sfComplete, bracket.final]);

  const reset = useCallback(() => {
    setBracket(emptyBracket());
    setStep(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // -------------------------------------------
  // Share
  // -------------------------------------------
  const shareText = useMemo(() => {
    if (!bracket.final) return '';
    const info = getTeamInfo(bracket.final);
    const finalist = bracket.final === finalTeams.teamA ? finalTeams.teamB : finalTeams.teamA;
    return `I just predicted my World Cup 2026 bracket!\n${info.flag} Champion: ${bracket.final}\nFinal: ${bracket.final} vs ${finalist}\nSimulate yours at fanxi.vercel.app/simulator\n#WC2026 #WorldCup2026 #FanXI`;
  }, [bracket.final, finalTeams]);

  const shareX = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
    );
  };

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      '_blank',
    );
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText('https://fanxi.vercel.app/simulator');
  };

  const downloadImage = async () => {
    if (!shareRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: '#060A06',
        scale: 2,
        width: 600,
        height: 315,
      });
      const link = document.createElement('a');
      link.download = 'fanxi-wc2026-bracket.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { /* html2canvas optional */ }
  };

  // -------------------------------------------
  // Render
  // -------------------------------------------

  if (!restored) return null;

  return (
    <>
      <Script
        id="simulator-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'FanXI World Cup 2026 Bracket Simulator',
            description: 'Simulate the entire FIFA World Cup 2026 tournament bracket',
            url: 'https://fanxi.vercel.app/simulator',
            applicationCategory: 'SportsApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />

      <div className="min-h-screen font-sans" style={{ color: 'var(--text)' }}>
        {/* HEADER */}
        <header className="pt-8 pb-6" style={{ background: 'transparent' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1
                  className="font-display font-semibold leading-none"
                  style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}
                >
                  WORLD CUP 2026 SIMULATOR
                </h1>
                <p className="mt-2 text-[15px]" style={{ color: 'var(--muted)' }}>
                  Predict every match. Share your bracket.
                </p>
              </div>
              <button
                onClick={reset}
                className="px-4 py-2 text-sm font-sans font-semibold border transition-all duration-200 hover:bg-red-600/20"
                style={{
                  borderColor: 'rgba(255,45,85,0.4)',
                  color: 'var(--red, #FF2D55)',
                }}
              >
                Reset Bracket
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-2">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setStep(i)}
                  className="flex-1 py-2 text-center text-sm font-sans font-semibold transition-all duration-300"
                  style={{
                    background: i === step ? 'rgba(0,255,133,0.12)' : 'rgba(255,255,255,0.04)',
                    borderBottom: i === step ? '2px solid var(--success)' : '2px solid transparent',
                    color: i === step ? 'var(--success)' : i < step ? 'var(--text)' : 'var(--muted)',
                    opacity: i <= step || canAdvance ? 1 : 0.5,
                  }}
                >
                  <span className="hidden sm:inline">Step {i + 1}: </span>{s}
                </button>
              ))}
            </div>
            <div className="h-1 w-full" style={{ background: 'var(--border)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${((step + (canAdvance ? 1 : 0)) / 4) * 100}%`,
                  background: 'var(--success)',
                }}
              />
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px 80px' }}>
          {/* STEP 0 — GROUP STAGE */}
          {step === 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-semibold text-[28px]">Group Stage</h2>
                <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
                  {completedGroupCount}/12 groups complete
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {GROUP_KEYS.map(gk => {
                  const gp = bracket.groups[gk];
                  const done = !!gp.first && !!gp.second;
                  return (
                    <div
                      key={gk}
                      className="glass-panel p-5 transition-all duration-300"
                      style={{
                        borderColor: done ? 'rgba(0,255,133,0.3)' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-semibold text-[20px]">
                          GROUP {gk}
                        </h3>
                        {done && (
                          <span style={{ color: 'var(--success)' }} className="text-lg">
                            &#10003;
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {WC2026_GROUPS[gk].teams.map(team => {
                          const info = getTeamInfo(team);
                          const is1st = gp.first === team;
                          const is2nd = gp.second === team;
                          const eliminated = done && !is1st && !is2nd;
                          return (
                            <div
                              key={team}
                              className="flex items-center justify-between py-2 px-3 transition-all duration-200"
                              style={{
                                background: is1st
                                  ? 'rgba(255,210,63,0.12)'
                                  : is2nd
                                  ? 'rgba(0,209,255,0.1)'
                                  : 'rgba(255,255,255,0.03)',
                                opacity: eliminated ? 0.35 : 1,
                                borderLeft: is1st
                                  ? '3px solid var(--gold)'
                                  : is2nd
                                  ? '3px solid var(--blue)'
                                  : '3px solid transparent',
                              }}
                            >
                              <span className="text-[15px]">
                                {info.flag} {info.name}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => pickGroup(gk, team, '1st')}
                                  className="px-3 py-1 text-xs font-sans font-semibold transition-all duration-200"
                                  style={{
                                    background: is1st ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                                    color: is1st ? '#000' : 'var(--muted)',
                                  }}
                                >
                                  1st
                                </button>
                                <button
                                  onClick={() => pickGroup(gk, team, '2nd')}
                                  className="px-3 py-1 text-xs font-sans font-semibold transition-all duration-200"
                                  style={{
                                    background: is2nd ? 'var(--blue)' : 'rgba(255,255,255,0.06)',
                                    color: is2nd ? '#000' : 'var(--muted)',
                                  }}
                                >
                                  2nd
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* STEP 1 — ROUND OF 32 */}
          {step === 1 && (
            <section>
              {/* 3rd place picker */}
              {bracket.thirdPlaceAdvancing.length < 8 || true ? (
                <div className="mb-8">
                  <h2 className="font-display font-semibold text-[28px] mb-2">
                    Third-Place Qualifiers
                  </h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                    Pick 8 of {thirdPlaceTeams.length} third-place teams to advance
                    ({bracket.thirdPlaceAdvancing.length}/8 selected)
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {thirdPlaceTeams.map(team => {
                      const info = getTeamInfo(team);
                      const selected = bracket.thirdPlaceAdvancing.includes(team);
                      return (
                        <button
                          key={team}
                          onClick={() => toggleThirdPlace(team)}
                          className="px-4 py-2 text-sm font-sans transition-all duration-200"
                          style={{
                            background: selected ? 'rgba(0,255,133,0.15)' : 'rgba(255,255,255,0.05)',
                            border: selected ? '1px solid var(--success)' : '1px solid var(--border)',
                            color: selected ? 'var(--success)' : 'var(--text)',
                          }}
                        >
                          {info.flag} {info.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* R32 matches */}
              {bracket.thirdPlaceAdvancing.length === 8 && r32Matchups.length > 0 && (
                <>
                  <h2 className="font-display font-semibold text-[28px] mb-4">
                    Round of 32
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {r32Matchups.map(m => (
                      <MatchCard
                        key={m.id}
                        label={m.label}
                        teamA={m.teamA}
                        teamB={m.teamB}
                        winner={bracket.r32[m.id] ?? null}
                        onPick={(t) => pickR32(m.id, t)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {/* STEP 2 — KNOCKOUTS (R16 + QF + SF) */}
          {step === 2 && (
            <section className="space-y-10">
              {/* R16 */}
              <div>
                <h2 className="font-display font-semibold text-[28px] mb-4">
                  Round of 16
                </h2>
                {r16Matchups.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {r16Matchups.map(m => (
                      <MatchCard
                        key={m.id}
                        label={m.label}
                        teamA={m.teamA}
                        teamB={m.teamB}
                        winner={bracket.r16[m.id] ?? null}
                        onPick={(t) => pickR16(m.id, t)}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--muted)' }}>
                    Complete Round of 32 first.
                  </p>
                )}
              </div>

              {/* QF */}
              {r16Complete && (
                <div>
                  <h2 className="font-display font-semibold text-[28px] mb-4">
                    Quarter Finals
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {qfMatchups.map(m => (
                      <MatchCard
                        key={m.id}
                        label={m.label}
                        teamA={m.teamA}
                        teamB={m.teamB}
                        winner={bracket.qf[m.id] ?? null}
                        onPick={(t) => pickQF(m.id, t)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SF */}
              {qfComplete && (
                <div>
                  <h2 className="font-display font-semibold text-[28px] mb-4">
                    Semi Finals
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sfMatchups.map(m => (
                      <MatchCard
                        key={m.id}
                        label={m.label}
                        teamA={m.teamA}
                        teamB={m.teamB}
                        winner={bracket.sf[m.id] ?? null}
                        onPick={(t) => pickSF(m.id, t)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* STEP 3 — THE FINAL */}
          {step === 3 && (
            <section className="flex flex-col items-center text-center">
              {finalTeams.teamA && finalTeams.teamB ? (
                <>
                  <div
                    className="glass-panel-strong w-full max-w-[640px] p-10 relative overflow-hidden"
                  >
                    {showConfetti && <Confetti />}
                    <p className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
                      FIFA WORLD CUP 2026
                    </p>
                    <h2 className="font-display font-semibold text-[40px] mb-8">
                      THE FINAL
                    </h2>
                    <div className="flex items-center justify-center gap-6 mb-8">
                      <FinalTeamButton
                        team={finalTeams.teamA}
                        selected={bracket.final === finalTeams.teamA}
                        onPick={pickChampion}
                      />
                      <span className="font-display font-semibold text-[24px]" style={{ color: 'var(--muted)' }}>
                        VS
                      </span>
                      <FinalTeamButton
                        team={finalTeams.teamB}
                        selected={bracket.final === finalTeams.teamB}
                        onPick={pickChampion}
                      />
                    </div>

                    {bracket.final && (
                      <div className="mt-6">
                        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
                          Your World Cup 2026 Champion
                        </p>
                        <p
                          className="font-display font-semibold"
                          style={{ fontSize: 'clamp(36px, 8vw, 64px)', color: 'var(--gold)' }}
                        >
                          {getTeamInfo(bracket.final).flag} {bracket.final.toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Share buttons */}
                  {bracket.final && (
                    <div className="mt-8 space-y-4 w-full max-w-[640px]">
                      <h3 className="font-display font-semibold text-[20px]">
                        Share your bracket
                      </h3>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <ShareButton label="Share on X" onClick={shareX} />
                        <ShareButton label="Share on WhatsApp" onClick={shareWhatsApp} />
                        <ShareButton label="Copy Link" onClick={copyLink} />
                        <ShareButton label="Download Image" onClick={downloadImage} />
                      </div>

                      {/* Hidden share card for html2canvas */}
                      <div
                        ref={shareRef}
                        className="fixed -left-[9999px] top-0"
                        style={{
                          width: 600,
                          height: 315,
                          background: '#060A06',
                          color: '#E8F5E8',
                          padding: 32,
                          fontFamily: 'Space Grotesk, sans-serif',
                        }}
                      >
                        <div style={{ fontSize: 14, color: '#5A7A5A', marginBottom: 8 }}>
                          FanXI &middot; World Cup 2026 Bracket
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 600, color: '#FFD23F', marginBottom: 12 }}>
                          {getTeamInfo(bracket.final).flag} MY CHAMPION: {bracket.final.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 16, marginBottom: 8 }}>
                          Final: {finalTeams.teamA} vs {finalTeams.teamB}
                        </div>
                        <div style={{ fontSize: 14, color: '#5A7A5A', marginBottom: 8 }}>
                          Semi-finalists: {sfMatchups.map(m => bracket.sf[m.id]).join(' | ')}
                        </div>
                        <div style={{ fontSize: 14, color: '#5A7A5A', marginTop: 'auto', position: 'absolute', bottom: 32 }}>
                          fanxi.vercel.app/simulator &middot; #WC2026 #FanXI
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Community stats */}
                  {community && community.total_submissions > 0 && (
                    <div className="mt-10 glass-panel p-6 w-full max-w-[640px]">
                      <h3 className="font-display font-semibold text-[18px] mb-4">
                        Community Predictions
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div>
                          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                            TOTAL BRACKETS
                          </p>
                          <p className="font-display font-semibold text-[24px]">
                            {community.total_submissions.toLocaleString()}
                          </p>
                        </div>
                        {community.most_picked_champion && (
                          <div>
                            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                              MOST PICKED CHAMPION
                            </p>
                            <p className="font-display font-semibold text-[24px]" style={{ color: 'var(--gold)' }}>
                              {getTeamInfo(community.most_picked_champion).flag}{' '}
                              {community.most_picked_champion}
                            </p>
                          </div>
                        )}
                      </div>
                      {Object.keys(community.champion_votes).length > 0 && (
                        <div className="mt-4 space-y-2">
                          {Object.entries(community.champion_votes)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([team, votes]) => {
                              const pct = Math.round((votes / community.total_submissions) * 100);
                              const info = getTeamInfo(team);
                              return (
                                <div key={team} className="flex items-center gap-3">
                                  <span className="text-sm w-[120px] truncate">
                                    {info.flag} {team}
                                  </span>
                                  <div className="flex-1 h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div
                                      className="h-full transition-all duration-500"
                                      style={{
                                        width: `${pct}%`,
                                        background: info.primary,
                                      }}
                                    />
                                  </div>
                                  <span className="font-mono text-xs w-[40px] text-right" style={{ color: 'var(--muted)' }}>
                                    {pct}%
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--muted)' }}>
                  Complete the semi-finals to unlock the final.
                </p>
              )}
            </section>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-10">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-6 py-3 font-sans font-semibold text-sm transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                &larr; Back
              </button>
            ) : (
              <div />
            )}
            {step < 3 && (
              <button
                onClick={() => canAdvance && setStep(s => s + 1)}
                disabled={!canAdvance}
                className="px-6 py-3 font-sans font-semibold text-sm transition-all duration-200"
                style={{
                  background: canAdvance ? 'var(--success)' : 'rgba(255,255,255,0.06)',
                  color: canAdvance ? '#000' : 'var(--muted)',
                  opacity: canAdvance ? 1 : 0.5,
                  cursor: canAdvance ? 'pointer' : 'not-allowed',
                }}
              >
                Next Step &rarr;
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MatchCard({
  label,
  teamA,
  teamB,
  winner,
  onPick,
}: {
  label: string;
  teamA: string | null;
  teamB: string | null;
  winner: string | null;
  onPick: (team: string) => void;
}) {
  if (!teamA || !teamB) return null;
  const infoA = getTeamInfo(teamA);
  const infoB = getTeamInfo(teamB);

  return (
    <div className="glass-panel p-4 flex items-center gap-3">
      <span className="font-mono text-xs w-[36px]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <button
        onClick={() => onPick(teamA)}
        className="flex-1 py-2 px-3 text-left text-sm font-sans transition-all duration-200"
        style={{
          background: winner === teamA ? `${infoA.primary}22` : 'rgba(255,255,255,0.04)',
          borderLeft: winner === teamA ? `3px solid ${infoA.primary}` : '3px solid transparent',
          opacity: winner && winner !== teamA ? 0.35 : 1,
          textDecoration: winner && winner !== teamA ? 'line-through' : 'none',
        }}
      >
        {infoA.flag} {infoA.name}
      </button>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>vs</span>
      <button
        onClick={() => onPick(teamB)}
        className="flex-1 py-2 px-3 text-left text-sm font-sans transition-all duration-200"
        style={{
          background: winner === teamB ? `${infoB.primary}22` : 'rgba(255,255,255,0.04)',
          borderLeft: winner === teamB ? `3px solid ${infoB.primary}` : '3px solid transparent',
          opacity: winner && winner !== teamB ? 0.35 : 1,
          textDecoration: winner && winner !== teamB ? 'line-through' : 'none',
        }}
      >
        {infoB.flag} {infoB.name}
      </button>
    </div>
  );
}

function FinalTeamButton({
  team,
  selected,
  onPick,
}: {
  team: string;
  selected: boolean;
  onPick: (t: string) => void;
}) {
  const info = getTeamInfo(team);
  return (
    <button
      onClick={() => onPick(team)}
      className="flex flex-col items-center gap-2 p-6 transition-all duration-300"
      style={{
        background: selected ? `${info.primary}22` : 'rgba(255,255,255,0.04)',
        border: selected ? `2px solid ${info.primary}` : '2px solid var(--border)',
        boxShadow: selected ? `0 0 24px ${info.primary}55` : 'none',
        minWidth: 140,
      }}
    >
      <span style={{ fontSize: 48 }}>{info.flag}</span>
      <span className="font-display font-semibold text-[18px]">{team}</span>
    </button>
  );
}

function ShareButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 text-sm font-sans font-semibold transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
      }}
    >
      {label}
    </button>
  );
}

function Confetti() {
  const colors = ['#FFD23F', '#FF2D55', '#00FF85', '#00D1FF', '#C084FC'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2"
          style={{
            background: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: -10,
            animation: `confettiFall ${1.5 + Math.random() * 2}s ease-out forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
