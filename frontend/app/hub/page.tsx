'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/src/components/NavBar';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';
import { formatMatchTime } from '@/src/utils/timezone';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Match {
  id: number;
  home_team: string;
  home_flag: string;
  away_team: string;
  away_flag: string;
  kickoff: string;
  venue: string;
  round: string;
  group: string;
}

interface Prediction {
  id: number;
  match_id: number;
  home_team?: string;
  away_team?: string;
  home_flag?: string;
  away_flag?: string;
  formation?: string;
  locked: boolean;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}


const RANK_COLORS: Record<string, string> = {
  Legend:    '#FFD700',
  Commander: '#C084FC',
  Tactician: '#60A5FA',
  Analyst:   '#34D399',
  Scout:     '#9CA3AF',
};

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const TICKER_ITEMS = [
  'WORLD CUP 2026 — JUNE 11 → JULY 19',
  'USA · CANADA · MEXICO — 48 NATIONS · 104 MATCHES',
  'PREDICT THE STARTING XI',
  'LOCK YOUR PREDICTION 1H BEFORE KICKOFF',
  'AI SCORES YOUR FOOTBALL IQ IN REAL TIME',
  'HALF-TIME PREDICTIONS — SUBS & TACTICS',
  'FREE-TO-PLAY · NO CREDIT CARD',
];

const LEAGUES = [
  {
    icon: '🌍',
    title: 'Global League',
    desc: 'Compete against every Scout on the platform. Full tournament duration. Real prestige for the top 100.',
    meta: ['FREE ENTRY', 'ALL WELCOME', 'FULL SEASON'],
    featured: false,
  },
  {
    icon: '👥',
    title: 'Private League',
    desc: 'Create a private league with friends or colleagues. Share a code. Trash talk freely.',
    meta: ['UP TO 50', 'CUSTOM NAME', 'MINI-LEAGUE'],
    featured: true,
  },
  {
    icon: '⚡',
    title: 'Daily Fantasy',
    desc: 'Build a squad for each matchday. Faster format for competitive players who want quick results.',
    meta: ['MATCHDAY', 'FAST FORMAT', 'CASUAL'],
    featured: false,
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function LiveBanner({ matches, primary, onWatch }: {
  matches: Match[];
  primary: string;
  onWatch: (id: number) => void;
}) {
  if (!matches.length) return null;
  return (
    <div
      className="border-b"
      style={{ background: 'rgba(255,45,85,0.06)', borderColor: 'rgba(255,45,85,0.25)' }}
    >
      <div className="max-w-[1400px] mx-auto px-7 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF2D55' }} />
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: '#FF2D55' }}>
            Live Now
          </span>
        </div>
        <div className="flex gap-3 flex-wrap">
          {matches.map(m => (
            <button
              key={m.id}
              onClick={() => onWatch(m.id)}
              className="flex items-center gap-2 font-sans font-semibold text-[13px] px-3 py-1 transition-all"
              style={{
                background: 'rgba(255,45,85,0.1)',
                border: '1px solid rgba(255,45,85,0.3)',
                color: 'var(--text)',
              }}
            >
              <span>{m.home_flag}</span>
              <span>{m.home_team}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>vs</span>
              <span>{m.away_team}</span>
              <span>{m.away_flag}</span>
              <span className="font-mono text-[10px]" style={{ color: '#FF2D55' }}>WATCH →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { team, primary } = useTheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
    if (!isLoading && user && !user.onboarding_complete) router.push('/onboarding');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [liveRes, allRes, predRes, lbRes] = await Promise.allSettled([
          fetch(`${API}/matches/live`).then(r => r.json()),
          fetch(`${API}/matches/all`).then(r => r.json()),
          fetch(`${API}/predictions/history/${user.id}`).then(r => r.json()),
          fetch(`${API}/predictions/leaderboard`).then(r => r.json()),
        ]);
        if (liveRes.status === 'fulfilled') setLiveMatches(Array.isArray(liveRes.value) ? liveRes.value : []);
        if (allRes.status === 'fulfilled') {
          const all: Match[] = Array.isArray(allRes.value) ? allRes.value : [];
          setUpcomingMatches(all.filter(m => hoursUntil(m.kickoff) > 0).slice(0, 4));
        } else {
          toast.error('Could not load fixtures — check your connection');
        }
        if (predRes.status === 'fulfilled') setPredictions(Array.isArray(predRes.value) ? predRes.value.slice(0, 4) : []);
        if (lbRes.status === 'fulfilled') setLeaderboard(Array.isArray(lbRes.value) ? lbRes.value.slice(0, 5) : []);
      } catch {
        toast.error('Connection issue — some data may not load');
      } finally {
        setDataLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, API]);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (isLoading || !user) return null;

  const isNewUser = !dataLoading && predictions.length === 0;
  const tickerFull = [...TICKER_ITEMS, ...TICKER_ITEMS].join('  ·  ');
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const QUICK_ACTIONS = [
    {
      icon: '⚽',
      label: 'Predict XI',
      desc: 'Build your tactical prediction',
      color: primary,
      action: () => router.push('/predict'),
    },
    {
      icon: '📅',
      label: 'Fixtures',
      desc: 'Browse all WC 2026 matches',
      color: 'var(--gold)',
      action: () => router.push('/matches'),
    },
    {
      icon: '🌍',
      label: 'Nation Intel',
      desc: 'Squad analysis & news',
      color: 'var(--blue)',
      action: () => router.push('/nation'),
    },
    {
      icon: '🤖',
      label: 'AI Coach',
      desc: 'Tactical insights & tips',
      color: '#C084FC',
      action: () => router.push('/ai'),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col font-sans" style={{ background: 'transparent', color: 'var(--text)' }}>
      <NavBar subtitle="HUB" />

      {/* Live banner */}
      <LiveBanner matches={liveMatches} primary={primary} onWatch={id => router.push(`/matches/${id}/live`)} />

      {/* ── PERSONAL HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ paddingTop: '56px', paddingBottom: '64px', background: 'transparent' }}
      >
        <div className="grid-bg-primary absolute inset-0 pointer-events-none" />
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none hidden lg:block"
          style={{ width: '45%', background: `radial-gradient(ellipse at right center, color-mix(in srgb, ${primary} 5%, transparent), transparent 70%)` }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-7">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-center">

            {/* Left: greeting */}
            <div>
              <div className="font-mono text-[11px] tracking-widest uppercase mb-4 theme-transition" style={{ color: primary }}>
                {greeting}, Scout
              </div>
              <h1
                className="font-display font-semibold leading-none mb-5"
                style={{ fontSize: 'clamp(52px, 8vw, 100px)', letterSpacing: '-1px', lineHeight: '0.9' }}
              >
                {user.display_name || user.username}
              </h1>
              <div className="flex items-center gap-3 mb-8 flex-wrap">
                <span
                  className="font-mono text-[11px] tracking-widest uppercase px-3 py-1.5"
                  style={{
                    background: `color-mix(in srgb, ${primary} 12%, transparent)`,
                    color: primary,
                    border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)`,
                  }}
                >
                  {user.rank_title}
                </span>
                <span
                  className="font-display font-semibold"
                  style={{ fontSize: '22px', color: 'var(--gold)' }}
                >
                  {user.football_iq_points} <span className="font-mono text-[11px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>IQ pts</span>
                </span>
                {user.favorite_nation && (
                  <span className="font-mono text-[11px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                    {user.favorite_nation}
                  </span>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => router.push('/predict')}
                  className="flex items-center gap-2 px-7 py-3.5 font-sans font-semibold text-[13px] transition-all hover:-translate-y-0.5 glow-primary"
                  style={{
                    background: primary,
                    color: 'var(--dark)',
                    clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
                  }}
                >
                  Predict Now →
                </button>
                <button
                  onClick={() => router.push('/leaderboard')}
                  className="flex items-center gap-2 px-7 py-3.5 font-sans font-semibold text-[13px] border transition-all"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = primary;
                    (e.currentTarget as HTMLButtonElement).style.color = primary;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                  }}
                >
                  Leaderboard
                </button>
              </div>
            </div>

            {/* Right: new-user CTA or stats grid */}
            {isNewUser ? (
              <div
                className="hidden lg:flex flex-col justify-center gap-5 p-8 border"
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  borderColor: 'rgba(255,210,63,0.3)',
                  backdropFilter: 'blur(16px)',
                  minWidth: '280px',
                  boxShadow: '0 0 40px rgba(255,210,63,0.06)',
                }}
              >
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
                    // Your First Call
                  </div>
                  <h3 className="font-display font-semibold leading-tight mb-3" style={{ fontSize: '22px' }}>
                    Ready to prove your<br />
                    <span style={{ color: 'var(--gold)' }}>tactical IQ?</span>
                  </h3>
                  <p className="font-sans text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                    Pick your starting XI, set your formation
                    and captain — then watch how you compare
                    to scouts worldwide when the lineup drops.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/matches')}
                  className="flex items-center justify-center gap-2 py-3.5 font-sans font-semibold text-[13px] transition-all hover:-translate-y-0.5"
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))',
                    boxShadow: '0 0 20px rgba(220,38,38,0.35)',
                  }}
                >
                  Make Your First Prediction →
                </button>
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>48 nations</span>
                  <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>104 matches</span>
                  <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Free to play</span>
                </div>
              </div>
            ) : (
              <div
                className="hidden lg:grid grid-cols-2 gap-px border theme-transition"
                style={{ borderColor: 'var(--border)', background: 'var(--border)', minWidth: '280px' }}
              >
                {[
                  { num: '48',   label: 'Nations'   },
                  { num: '104',  label: 'Matches'   },
                  { num: String(predictions.length), label: 'My Predictions' },
                  { num: String(user.football_iq_points), label: 'IQ Points' },
                ].map(s => (
                  <div
                    key={s.label}
                    className="flex flex-col justify-center items-center py-9 theme-transition"
                    style={{ background: 'var(--dark3)' }}
                  >
                    <div
                      className="font-display font-semibold leading-none theme-transition"
                      style={{ fontSize: 'clamp(30px, 3vw, 44px)', color: primary }}
                    >
                      {s.num}
                    </div>
                    <div className="font-mono text-[9px] tracking-widest uppercase mt-1.5 text-center" style={{ color: 'var(--muted)' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="w-full overflow-hidden relative z-10 py-3 theme-transition" style={{ background: primary, color: 'var(--dark)' }}>
        <div className="ticker-inner font-mono font-bold text-[11px] tracking-widest uppercase">
          {tickerFull} &nbsp;&nbsp; {tickerFull}
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <section className="py-14" style={{ background: 'transparent' }}>
        <div className="max-w-[1400px] mx-auto px-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="font-mono text-[11px] tracking-widest uppercase theme-transition" style={{ color: primary }}>
              // Quick Actions
            </div>
            {isNewUser && (
              <div className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 animate-pulse"
                style={{ color: 'var(--gold)', border: '1px solid rgba(255,210,63,0.3)', background: 'rgba(255,210,63,0.08)' }}>
                Start here ↓
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((a, idx) => {
              const highlight = isNewUser && idx === 0;
              return (
                <button
                  key={a.label}
                  onClick={a.action}
                  className="flex flex-col items-start gap-3 p-6 border text-left transition-all duration-200 hover:-translate-y-0.5 group relative"
                  style={{
                    background: highlight ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.35)',
                    borderColor: highlight ? 'rgba(220,38,38,0.5)' : 'var(--border)',
                    backdropFilter: 'blur(12px)',
                    animation: highlight ? 'predictPulse 2.5s ease-in-out infinite' : undefined,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${a.color} 50%, transparent)`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = highlight ? 'rgba(220,38,38,0.5)' : 'var(--border)')}
                >
                  {highlight && (
                    <div className="absolute -top-2.5 left-4 font-mono text-[9px] uppercase tracking-widest px-2 py-0.5"
                      style={{ background: '#dc2626', color: '#fff' }}>
                      Start here
                    </div>
                  )}
                  <span className="text-3xl leading-none">{a.icon}</span>
                  <div>
                    <div className="font-display font-semibold text-[18px] mb-1" style={{ color: a.color }}>
                      {a.label}
                    </div>
                    <div className="font-sans text-[12px]" style={{ color: 'var(--muted)' }}>
                      {a.desc}
                    </div>
                  </div>
                  <div className="mt-auto font-mono text-[10px] tracking-widest uppercase" style={{ color: a.color, opacity: 0.6 }}>
                    Open →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── UPCOMING MATCHES ── */}
      {upcomingMatches.length > 0 && (
        <section className="py-14 border-t" style={{ background: 'transparent', borderColor: 'var(--border)' }}>
          <div className="max-w-[1400px] mx-auto px-7">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="font-mono text-[11px] tracking-widest uppercase mb-2 theme-transition" style={{ color: primary }}>
                  // Next Up
                </div>
                <h2 className="font-display font-semibold leading-none" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
                  UPCOMING <span style={{ color: primary }}>MATCHES</span>
                </h2>
              </div>
              <button
                onClick={() => router.push('/matches')}
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all hidden sm:block"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = primary; (e.currentTarget as HTMLButtonElement).style.borderColor = `color-mix(in srgb, ${primary} 40%, transparent)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {upcomingMatches.map(m => {
                const hours = hoursUntil(m.kickoff);
                const isSoon = hours < 48;
                return (
                  <div
                    key={m.id}
                    className="border p-5 flex flex-col gap-3 transition-all duration-200"
                    style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 40%, transparent)`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5"
                        style={{ color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`, background: `color-mix(in srgb, ${primary} 8%, transparent)` }}
                      >
                        {m.round}
                      </span>
                      {isSoon && (
                        <span className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 animate-pulse"
                          style={{ color: '#00FF85', border: '1px solid rgba(0,255,133,0.3)', background: 'rgba(0,255,133,0.08)' }}>
                          {Math.floor(hours)}h
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-2xl">{m.home_flag}</span>
                        <span className="font-display font-semibold text-[14px] text-center leading-tight">{m.home_team}</span>
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>VS</span>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-2xl">{m.away_flag}</span>
                        <span className="font-display font-semibold text-[14px] text-center leading-tight">{m.away_team}</span>
                      </div>
                    </div>
                    <div className="font-mono text-[10px] tracking-wide" style={{ color: 'var(--muted)' }}>
                      {formatMatchTime(m.kickoff)}
                    </div>
                    {isNewUser && (
                      <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,210,63,0.6)' }}>
                        🔒 Lock in before kickoff to score
                      </div>
                    )}
                    <button
                      onClick={() => router.push(`/predict?match=${m.id}&team=${encodeURIComponent(m.home_team)}&away=${encodeURIComponent(m.away_team)}`)}
                      className="w-full py-2 font-sans font-semibold text-[12px] transition-all mt-auto theme-transition"
                      style={{ background: `color-mix(in srgb, ${primary} 14%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${primary} 24%, transparent)`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb, ${primary} 14%, transparent)`; }}
                    >
                      Predict →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── MY PREDICTIONS + LEADERBOARD ── */}
      <section className="py-14 border-t" style={{ background: 'transparent', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-7">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

            {/* My Predictions */}
            <div>
              <div className="font-mono text-[11px] tracking-widest uppercase mb-2 theme-transition" style={{ color: primary }}>
                // My Activity
              </div>
              <div className="flex items-end justify-between mb-6">
                <h2 className="font-display font-semibold leading-none" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
                  MY <span style={{ color: primary }}>PREDICTIONS</span>
                </h2>
                <button
                  onClick={() => router.push('/predict?tab=history')}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all hidden sm:block"
                  style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = primary; (e.currentTarget as HTMLButtonElement).style.borderColor = `color-mix(in srgb, ${primary} 40%, transparent)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                >
                  View All →
                </button>
              </div>

              {dataLoading ? (
                <div className="flex items-center gap-2 py-8" style={{ color: 'var(--muted)' }}>
                  <span className="font-mono text-[11px] tracking-widest uppercase">Loading...</span>
                </div>
              ) : predictions.length === 0 ? (
                <div
                  className="border p-8 text-center"
                  style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
                >
                  <div className="text-3xl mb-3">⚽</div>
                  <p className="font-sans text-[14px] mb-4" style={{ color: 'var(--muted)' }}>
                    No predictions yet. Start by picking a match.
                  </p>
                  <button
                    onClick={() => router.push('/predict')}
                    className="font-sans font-semibold text-[13px] px-6 py-2.5 transition-all"
                    style={{ background: primary, color: 'var(--dark)' }}
                  >
                    Make First Prediction
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {predictions.map(p => (
                    <div
                      key={p.id}
                      className="border p-4 flex items-center gap-4 transition-all cursor-pointer"
                      style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
                      onClick={() => router.push(`/matches/${p.match_id}/live`)}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl">{p.home_flag || '🏳'}</span>
                        <span className="font-display font-semibold text-[14px] truncate">{p.home_team || `Match #${p.match_id}`}</span>
                        <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>vs</span>
                        <span className="font-display font-semibold text-[14px] truncate">{p.away_team || ''}</span>
                        <span className="text-xl">{p.away_flag || ''}</span>
                      </div>
                      {p.formation && (
                        <span
                          className="font-mono text-[10px] tracking-widest uppercase px-2 py-1 flex-shrink-0"
                          style={{ color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)`, background: `color-mix(in srgb, ${primary} 8%, transparent)` }}
                        >
                          {p.formation}
                        </span>
                      )}
                      <span
                        className="font-mono text-[10px] tracking-widest uppercase px-2 py-1 flex-shrink-0"
                        style={p.locked
                          ? { color: '#00FF85', border: '1px solid rgba(0,255,133,0.3)', background: 'rgba(0,255,133,0.08)' }
                          : { color: 'var(--muted)', border: '1px solid var(--border)' }
                        }
                      >
                        {p.locked ? 'Locked' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard preview */}
            <div>
              <div className="font-mono text-[11px] tracking-widest uppercase mb-2 theme-transition" style={{ color: 'var(--gold)' }}>
                // Global Rankings
              </div>
              <div className="flex items-end justify-between mb-6">
                <h2 className="font-display font-semibold leading-none" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
                  TOP <span style={{ color: 'var(--gold)' }}>5</span>
                </h2>
                <button
                  onClick={() => router.push('/leaderboard')}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all hidden sm:block"
                  style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,210,63,0.4)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                >
                  Full Board →
                </button>
              </div>

              {dataLoading ? (
                <div className="flex items-center gap-2 py-8" style={{ color: 'var(--muted)' }}>
                  <span className="font-mono text-[11px] tracking-widest uppercase">Loading...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {leaderboard.map(entry => {
                    const isMe = entry.username === user.username;
                    const rankColor = RANK_COLORS[entry.rank_title] || 'var(--muted)';
                    return (
                      <div
                        key={entry.rank}
                        className="border p-4 flex items-center gap-3 transition-all"
                        style={{
                          background: isMe ? `color-mix(in srgb, ${primary} 8%, rgba(0,0,0,0.35))` : 'rgba(0,0,0,0.35)',
                          borderColor: isMe ? `color-mix(in srgb, ${primary} 35%, transparent)` : 'var(--border)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <span className="font-display font-semibold w-6 text-center flex-shrink-0" style={{ fontSize: '20px' }}>
                          {RANK_MEDALS[entry.rank] || `${entry.rank}`}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-sans font-semibold text-[14px] truncate" style={{ color: isMe ? primary : 'var(--text)' }}>
                            {entry.username} {isMe && <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: primary }}>(you)</span>}
                          </div>
                          <div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: rankColor }}>
                            {entry.rank_title}
                          </div>
                        </div>
                        <div className="font-display font-semibold text-[18px] flex-shrink-0" style={{ color: 'var(--gold)' }}>
                          {entry.football_iq_points}
                          <span className="font-mono text-[9px] tracking-widest uppercase ml-1" style={{ color: 'var(--muted)' }}>pts</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* My rank if not in top 5 */}
                  {leaderboard.length > 0 && !leaderboard.find(e => e.username === user.username) && (
                    <div
                      className="border p-4 flex items-center gap-3"
                      style={{ background: `color-mix(in srgb, ${primary} 8%, rgba(0,0,0,0.35))`, borderColor: `color-mix(in srgb, ${primary} 35%, transparent)`, backdropFilter: 'blur(12px)' }}
                    >
                      {isNewUser ? (
                        <div className="w-full text-center py-1">
                          <span
                            className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5"
                            style={{
                              color: 'var(--gold)',
                              border: '1px solid rgba(255,210,63,0.25)',
                              background: 'rgba(255,210,63,0.06)',
                            }}
                          >
                            Make 1 prediction to unlock your IQ rank
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>—</span>
                          <div className="flex-1">
                            <div className="font-sans font-semibold text-[14px]" style={{ color: primary }}>
                              {user.username} <span className="font-mono text-[9px] tracking-widest uppercase">(you)</span>
                            </div>
                            <div className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{user.rank_title}</div>
                          </div>
                          <div className="font-display font-semibold text-[18px]" style={{ color: 'var(--gold)' }}>
                            {user.football_iq_points} <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>pts</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 border-t relative" style={{ background: 'transparent', borderColor: 'var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 100%)' }} />
        <div className="relative z-10 max-w-[1400px] mx-auto px-7">
          <div className="mb-12 reveal">
            <div className="font-mono text-[11px] tracking-widest uppercase mb-3 theme-transition" style={{ color: primary }}>
              // Match Day Experience
            </div>
            <h2 className="font-display font-semibold leading-none" style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}>
              HOW IT<br /><span style={{ color: primary }}>WORKS</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
            {[
              {
                num: '01', phase: 'PRE-MATCH', time: '-1h 05m', color: primary,
                icon: '⚡', title: 'Predict the Starting XI',
                body: 'Study the squad and pick who you think starts. Set your formation, name your captain, then predict match stats.',
                items: ['11 starting players', 'Formation & shape', 'Captain pick', 'Score, corners, BTTS'],
                badge: '🔒 Locks before kickoff',
              },
              {
                num: '02', phase: 'HALF-TIME', time: "45'", color: 'var(--gold)',
                icon: '⏱️', title: 'Adjust Your Haki',
                body: 'You saw the first half. Now predict how the manager reacts — substitutions, shape shifts and second-half approach.',
                items: ['1st, 2nd & 3rd sub (in & out)', 'Formation change?', 'Second half mentality', 'Next goalscorer'],
                badge: "🔒 Locks at 60'",
              },
              {
                num: '03', phase: 'FULL-TIME', time: '90\'+', color: 'var(--blue)',
                icon: '🤖', title: 'AI Scores Your IQ',
                body: 'The moment the official lineup drops, AI instantly compares your predictions and gives personalised feedback.',
                items: ['Starting XI accuracy %', 'Tactical read score', 'Sub prediction rating', 'Football IQ points awarded'],
                badge: '🏆 Results & leaderboard live',
              },
            ].map(c => (
              <div
                key={c.num}
                className="relative p-8 flex flex-col gap-5 overflow-hidden reveal"
                style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <div className="absolute right-4 top-4 font-display font-semibold leading-none select-none pointer-events-none"
                  style={{ fontSize: '120px', color: c.color, opacity: 0.04, lineHeight: 1 }}>{c.num}</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] tracking-widest uppercase px-2 py-1"
                    style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color, border: `1px solid color-mix(in srgb, ${c.color} 25%, transparent)` }}>
                    {c.phase}
                  </span>
                  <span className="font-display font-semibold" style={{ fontSize: '26px', color: c.color }}>{c.time}</span>
                </div>
                <div>
                  <div className="text-3xl mb-3">{c.icon}</div>
                  <h3 className="font-display font-semibold mb-2" style={{ fontSize: '22px' }}>{c.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>{c.body}</p>
                </div>
                <ul className="flex flex-col gap-2">
                  {c.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase mt-auto w-fit"
                  style={{ background: `color-mix(in srgb, ${c.color} 8%, transparent)`, color: c.color, border: `1px solid color-mix(in srgb, ${c.color} 22%, transparent)` }}>
                  {c.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEAGUES ── */}
      <section id="leagues" className="py-24 border-t" style={{ background: 'transparent', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-7">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-3 theme-transition" style={{ color: primary }}>// Competition</div>
          <h2 className="font-display font-semibold mb-14 leading-none" style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}>
            LEAGUE<br />FORMATS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {LEAGUES.map(league => (
              <div
                key={league.title}
                className="relative p-10 border transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ background: 'rgba(0,0,0,0.35)', borderColor: league.featured ? 'rgba(255,210,63,0.3)' : 'var(--border)', backdropFilter: 'blur(12px)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = league.featured ? 'var(--gold)' : primary)}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = league.featured ? 'rgba(255,210,63,0.3)' : 'var(--border)')}
              >
                {league.featured && (
                  <span className="absolute top-4 right-4 font-mono text-[8px] font-bold tracking-wide uppercase px-2 py-1"
                    style={{ background: 'var(--gold)', color: 'var(--dark)' }}>
                    Popular
                  </span>
                )}
                <div className="text-4xl mb-4">{league.icon}</div>
                <h3 className="font-display font-semibold mb-3 tracking-wide" style={{ fontSize: '26px', letterSpacing: '1px' }}>{league.title}</h3>
                <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--muted)' }}>{league.desc}</p>
                <div className="flex gap-3 flex-wrap">
                  {league.meta.map(m => <span key={m} className="font-mono text-[9px] tracking-wide" style={{ color: primary }}>{m}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pt-14 pb-9 border-t" style={{ background: 'transparent', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-14 mb-14">
            <div className="col-span-2 md:col-span-1">
              <div className="font-display font-semibold text-4xl mb-3 tracking-wider" style={{ color: primary }}>
                Fan<span style={{ color: 'var(--gold)' }}>XI</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                The ultimate tactical prediction platform for the 2026 FIFA World Cup. Built for fans who think like coaches — from Dallas, Texas.
              </p>
            </div>
            <div>
              <div className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: primary }}>Platform</div>
              <ul className="space-y-2">
                {[['Predict', '/predict'], ['Leaderboard', '/leaderboard'], ['Matches', '/matches'], ['Guide', '/guide']].map(([label, href]) => (
                  <li key={label}><a href={href} className="text-[13px] transition-colors" style={{ color: 'var(--muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: primary }}>Info</div>
              <ul className="space-y-2">
                {[['How It Works', '#'], ['Nation Intel', '/nation'], ['Guide', '/guide']].map(([label, href]) => (
                  <li key={label}><a href={href} className="text-[13px] transition-colors" style={{ color: 'var(--muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: primary }}>Dev</div>
              <ul className="space-y-2">
                {([
                  { label: 'GitHub ↗', href: 'https://github.com/venomraw', external: true },
                  { label: 'LinkedIn ↗', href: 'https://www.linkedin.com/in/binamra-sigdel-377553156/', external: true },
                  { label: 'MIT License', href: '#', external: false },
                ] as { label: string; href: string; external: boolean }[]).map(({ label, href, external }) => (
                  <li key={label}><a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
                    className="text-[13px] transition-colors" style={{ color: 'var(--muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>{label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex justify-between items-center pt-7 border-t flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
            <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--muted)' }}>
              © 2026 FanXI · Built by Venomraw · Free-to-play · Not affiliated with FIFA.
            </span>
            <span className="font-mono text-[10px] tracking-wider" style={{ color: primary }}>
              DALLAS · TEXAS · USA
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
