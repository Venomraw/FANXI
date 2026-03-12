'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/src/components/NavBar';
import { useAuth } from '@/src/context/AuthContext';

// ─── Static fallback data ──────────────────────────────────────────────────────

const FALLBACK_MATCH = {
  id: 1,
  home_team: 'Mexico',
  home_flag: '🇲🇽',
  away_team: 'Canada',
  away_flag: '🇨🇦',
  kickoff: '2026-06-11T20:00:00Z',
  venue: 'Estadio Azteca, Mexico City',
  group: 'GROUP A · MD1',
};

const WC_KICKOFF = '2026-06-11T20:00:00Z';

const HOW_IT_WORKS = [
  {
    icon: '🎯',
    title: 'Predict the Starting XI',
    desc: 'Study the squad, pick your 11, set formation + captain before every match.',
  },
  {
    icon: '⚡',
    title: 'Adjust Your Haki',
    desc: 'Predict half-time subs, formation shifts, mentality changes mid-game.',
  },
  {
    icon: '🧠',
    title: 'AI Scores Your IQ',
    desc: "When the lineup drops, AI compares your prediction and scores you instantly.",
  },
];

const WC2026_GROUPS: Record<string, { flag: string; name: string }[]> = {
  A: [
    { flag: '🇺🇸', name: 'USA' },
    { flag: '🇲🇽', name: 'Mexico' },
    { flag: '🇨🇦', name: 'Canada' },
    { flag: '🇯🇲', name: 'Jamaica' },
  ],
  B: [
    { flag: '🇧🇷', name: 'Brazil' },
    { flag: '🇪🇨', name: 'Ecuador' },
    { flag: '🇲🇦', name: 'Morocco' },
    { flag: '🇹🇳', name: 'Tunisia' },
  ],
  C: [
    { flag: '🇦🇷', name: 'Argentina' },
    { flag: '🇨🇴', name: 'Colombia' },
    { flag: '🇵🇾', name: 'Paraguay' },
    { flag: '🇧🇴', name: 'Bolivia' },
  ],
  D: [
    { flag: '🇫🇷', name: 'France' },
    { flag: '🇧🇪', name: 'Belgium' },
    { flag: '🇨🇭', name: 'Switzerland' },
    { flag: '🇦🇹', name: 'Austria' },
  ],
  E: [
    { flag: '🇩🇪', name: 'Germany' },
    { flag: '🇳🇱', name: 'Netherlands' },
    { flag: '🇵🇱', name: 'Poland' },
    { flag: '🇷🇴', name: 'Romania' },
  ],
  F: [
    { flag: '🇪🇸', name: 'Spain' },
    { flag: '🇭🇷', name: 'Croatia' },
    { flag: '🇨🇿', name: 'Czechia' },
    { flag: '🇦🇱', name: 'Albania' },
  ],
  G: [
    { flag: '🇵🇹', name: 'Portugal' },
    { flag: '🇩🇰', name: 'Denmark' },
    { flag: '🇹🇷', name: 'Turkey' },
    { flag: '🇬🇪', name: 'Georgia' },
  ],
  H: [
    { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'England' },
    { flag: '🇮🇹', name: 'Italy' },
    { flag: '🇺🇦', name: 'Ukraine' },
    { flag: '🇸🇰', name: 'Slovakia' },
  ],
  I: [
    { flag: '🇺🇾', name: 'Uruguay' },
    { flag: '🇨🇱', name: 'Chile' },
    { flag: '🇵🇪', name: 'Peru' },
    { flag: '🇵🇦', name: 'Panama' },
  ],
  J: [
    { flag: '🇸🇳', name: 'Senegal' },
    { flag: '🇨🇲', name: 'Cameroon' },
    { flag: '🇬🇭', name: 'Ghana' },
    { flag: '🇳🇬', name: 'Nigeria' },
  ],
  K: [
    { flag: '🇯🇵', name: 'Japan' },
    { flag: '🇰🇷', name: 'South Korea' },
    { flag: '🇸🇦', name: 'Saudi Arabia' },
    { flag: '🇦🇺', name: 'Australia' },
  ],
  L: [
    { flag: '🇷🇸', name: 'Serbia' },
    { flag: '🇭🇺', name: 'Hungary' },
    { flag: '🇮🇷', name: 'Iran' },
    { flag: '🇬🇷', name: 'Greece' },
  ],
};

const FALLBACK_LEADERBOARD = [
  { rank: 1, username: 'EliteTactician_BR', country_allegiance: '🇧🇷', football_iq_points: 2847, rank_title: 'Elite Scout' },
  { rank: 2, username: 'MaestroXI_ES',      country_allegiance: '🇪🇸', football_iq_points: 2654, rank_title: 'Master Scout' },
  { rank: 3, username: 'TacticoFR',         country_allegiance: '🇫🇷', football_iq_points: 2398, rank_title: 'Elite Scout' },
  { rank: 4, username: 'ScoutKing_DE',      country_allegiance: '🇩🇪', football_iq_points: 2156, rank_title: 'Tactician'   },
  { rank: 5, username: 'FootballIQ_JP',     country_allegiance: '🇯🇵', football_iq_points: 1987, rank_title: 'Analyst'     },
];

const MOCK_SCOUTS = [
  { avatar: '🦁', username: 'EliteTactician_BR', nation: '🇧🇷', formation: '4-3-3',   iq: 2847 },
  { avatar: '🎯', username: 'MaestroXI_ES',      nation: '🇪🇸', formation: '4-2-3-1', iq: 2654 },
  { avatar: '⚡', username: 'TacticoFR',         nation: '🇫🇷', formation: '3-4-3',   iq: 2398 },
];

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ─── Types ────────────────────────────────────────────────────────────────────

interface NextMatch {
  id: number;
  home_team: string;
  home_flag: string;
  away_team: string;
  away_flag: string;
  kickoff: string;
  venue: string;
  group: string;
}

interface Countdown {
  days: number;
  hours: number;
  mins: number;
  secs: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniPitch() {
  return (
    <svg viewBox="0 0 200 290" style={{ width: '100%', maxWidth: '200px' }} aria-hidden="true">
      <rect width="200" height="290" rx="8" fill="rgba(0,35,10,0.85)" />
      {/* Grid lines */}
      <line x1="0" y1="145" x2="200" y2="145" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <circle cx="100" cy="145" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <rect x="50" y="4"   width="100" height="44" rx="2" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <rect x="50" y="242" width="100" height="44" rx="2" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* 4-3-3 — GK → DEF → MID → FWD (bottom to top) */}
      {/* GK */}
      {[[100, 268]].map(([cx, cy], i) => (
        <circle key={`gk${i}`} cx={cx} cy={cy} r="9" fill="var(--red)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      ))}
      {/* DEF x4 */}
      {[[30, 218],[75, 218],[125, 218],[170, 218]].map(([cx, cy], i) => (
        <circle key={`def${i}`} cx={cx} cy={cy} r="9" fill="var(--red)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      ))}
      {/* MID x3 */}
      {[[50, 160],[100, 160],[150, 160]].map(([cx, cy], i) => (
        <circle key={`mid${i}`} cx={cx} cy={cy} r="9" fill="var(--red)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      ))}
      {/* FWD x3 */}
      {[[40, 100],[100, 95],[160, 100]].map(([cx, cy], i) => (
        <circle key={`fwd${i}`} cx={cx} cy={cy} r="9" fill="var(--red)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      ))}
    </svg>
  );
}

function cdTick(isoTarget: string): Countdown {
  const diff = new Date(isoTarget).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000)  / 60000),
    secs:  Math.floor((diff % 60000)    / 1000),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [nextMatch, setNextMatch]         = useState<NextMatch>(FALLBACK_MATCH);
  const [liveMatch, setLiveMatch]         = useState<NextMatch | null>(null);
  const [countdown, setCountdown]         = useState<Countdown>(cdTick(FALLBACK_MATCH.kickoff));
  const [wcCountdown, setWcCountdown]     = useState<Countdown>(cdTick(WC_KICKOFF));
  const [upcoming, setUpcoming]           = useState<NextMatch[]>([]);
  const [leaderboard, setLeaderboard]     = useState<LeaderboardEntry[]>(FALLBACK_LEADERBOARD);
  const [dailyBrief, setDailyBrief]       = useState('');
  const [briefLoading, setBriefLoading]   = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('A');

  // ── Countdown ticks ──
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(cdTick(nextMatch.kickoff));
      setWcCountdown(cdTick(WC_KICKOFF));
    }, 1000);
    return () => clearInterval(id);
  }, [nextMatch.kickoff]);

  // ── Fetch all data on mount ──
  useEffect(() => {
    const load = async () => {
      const [liveRes, allRes, upcomingRes, lbRes, briefRes] = await Promise.allSettled([
        fetch(`${API}/matches/live`).then(r => r.json()),
        fetch(`${API}/matches/all`).then(r => r.json()),
        fetch(`${API}/matches/upcoming`).then(r => r.json()),
        fetch(`${API}/predictions/leaderboard`).then(r => r.json()),
        fetch(`${API}/ai/daily-brief`).then(r => r.json()),
      ]);

      if (liveRes.status === 'fulfilled' && Array.isArray(liveRes.value) && liveRes.value.length > 0) {
        setLiveMatch(liveRes.value[0]);
      }

      if (allRes.status === 'fulfilled' && Array.isArray(allRes.value)) {
        const nxt = allRes.value.find((m: NextMatch) => new Date(m.kickoff).getTime() > Date.now());
        if (nxt) { setNextMatch(nxt); setCountdown(cdTick(nxt.kickoff)); }
      }

      if (upcomingRes.status === 'fulfilled' && Array.isArray(upcomingRes.value)) {
        setUpcoming(upcomingRes.value.slice(0, 4));
      } else if (allRes.status === 'fulfilled' && Array.isArray(allRes.value)) {
        setUpcoming(
          (allRes.value as NextMatch[])
            .filter(m => new Date(m.kickoff).getTime() > Date.now())
            .slice(0, 4)
        );
      }

      if (lbRes.status === 'fulfilled' && Array.isArray(lbRes.value) && lbRes.value.length > 0) {
        setLeaderboard(lbRes.value.slice(0, 5));
      }

      if (briefRes.status === 'fulfilled' && briefRes.value?.insight) {
        setDailyBrief(briefRes.value.insight);
      }
      setBriefLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const res = await fetch(`${API}/ai/daily-brief?refresh=true`).then(r => r.json());
      if (res.insight) setDailyBrief(res.insight);
    } finally {
      setBriefLoading(false);
    }
  }, [API]);

  const handlePredict = (matchId?: number) => {
    if (user) router.push(matchId ? `/predict?match=${matchId}` : '/predict');
    else       router.push(matchId ? `/login?redirect=/predict?match=${matchId}` : '/login');
  };

  const displayMatch = liveMatch ?? nextMatch;
  const isLive = !!liveMatch;

  // ─── Countdown widget (reusable) ─────────────────────────────────────────────
  function CountdownGrid({ cd, large = false }: { cd: Countdown; large?: boolean }) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: 'DAYS', val: cd.days },
          { label: 'HRS',  val: cd.hours },
          { label: 'MIN',  val: cd.mins },
          { label: 'SEC',  val: cd.secs },
        ] as const).map(({ label, val }) => (
          <div
            key={label}
            className="flex flex-col items-center py-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <span
              className="font-display font-semibold leading-none"
              style={{ fontSize: large ? '42px' : '30px', color: 'var(--text)' }}
            >
              {String(val).padStart(2, '0')}
            </span>
            <span
              className="font-mono mt-1"
              style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--muted)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col font-sans" style={{ background: 'transparent', color: 'var(--text)' }}>
      <NavBar />

      {/* ══════════════════════════════════════
          SECTION 1 — HERO
      ══════════════════════════════════════ */}
      <section
        id="hero"
        className="relative flex flex-col justify-center overflow-hidden"
        style={{ minHeight: '100svh', paddingTop: '100px', paddingBottom: '100px' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(120deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.2) 100%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 pointer-events-none"
          style={{
            width: '600px', height: '400px',
            background: 'radial-gradient(ellipse at bottom left, rgba(255,45,85,0.1) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-7 w-full">
          <div className="grid lg:grid-cols-[58%_42%] gap-10 xl:gap-16 items-center">

            {/* LEFT */}
            <div className="flex flex-col gap-7">
              <p className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--red)' }}>
                WORLD CUP 2026 · TACTICAL HUB
              </p>
              <h1
                className="font-display font-semibold leading-[0.92]"
                style={{ fontSize: 'clamp(60px, 9vw, 110px)', color: 'var(--text)' }}
              >
                PREDICT<br />THE STARTING<br />
                <span style={{ color: 'var(--red)' }}>XI</span>
              </h1>
              <p className="font-sans max-w-[480px]" style={{ fontSize: '16px', color: 'rgba(240,247,240,0.68)', lineHeight: 1.75 }}>
                The world&apos;s first tactical prediction platform for the World Cup.
                Pick your XI, set your formation and captain — then watch AI score
                your tactical IQ when the lineup drops.
              </p>
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => handlePredict()}
                  className="flex items-center gap-2.5 font-sans font-bold rounded-lg transition-all duration-300"
                  style={{ background: 'var(--red)', color: '#fff', fontSize: '15px', padding: '16px 32px', boxShadow: '0 0 28px rgba(255,45,85,0.35)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ff4d6d'; e.currentTarget.style.boxShadow = '0 0 36px rgba(255,45,85,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(255,45,85,0.35)'; }}
                >
                  ⚽ Start Predicting — It&apos;s Free
                </button>
                <button
                  onClick={() => router.push('/matches')}
                  className="flex items-center gap-2 font-sans font-semibold rounded-lg transition-all duration-300"
                  style={{ border: '1px solid rgba(255,255,255,0.28)', color: 'var(--text)', fontSize: '15px', padding: '16px 32px', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  View Fixtures →
                </button>
              </div>
            </div>

            {/* RIGHT — Live / Next Match card */}
            <div
              className="rounded-2xl p-6 flex flex-col gap-5"
              style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-center gap-2">
                {isLive ? (
                  <>
                    <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--red)' }} />
                    <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--red)' }}>LIVE NOW</span>
                  </>
                ) : (
                  <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--gold)' }}>NEXT MATCH</span>
                )}
              </div>
              <p className="font-mono text-[11px] tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
                {displayMatch.group}
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <span style={{ fontSize: '52px', lineHeight: 1 }}>{displayMatch.home_flag}</span>
                  <span className="font-display font-semibold text-center" style={{ fontSize: '14px' }}>{displayMatch.home_team}</span>
                </div>
                <span className="font-display font-semibold flex-shrink-0" style={{ fontSize: '20px', color: 'rgba(240,247,240,0.25)' }}>VS</span>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <span style={{ fontSize: '52px', lineHeight: 1 }}>{displayMatch.away_flag}</span>
                  <span className="font-display font-semibold text-center" style={{ fontSize: '14px' }}>{displayMatch.away_team}</span>
                </div>
              </div>
              {!isLive && <CountdownGrid cd={countdown} />}
              <p className="font-sans text-[12px]" style={{ color: 'rgba(240,247,240,0.38)' }}>🏟️ {displayMatch.venue}</p>
              <button
                onClick={() => handlePredict(displayMatch.id)}
                className="w-full py-3.5 rounded-lg font-sans font-bold text-[14px] transition-all duration-300"
                style={{ background: 'var(--red)', color: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ff4d6d'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--red)'; }}
              >
                {isLive ? 'Watch Live →' : 'Predict This Match →'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats ticker */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="max-w-[1400px] mx-auto px-7 py-4">
            <p className="font-sans text-center" style={{ fontSize: '13px', color: 'rgba(240,247,240,0.52)', letterSpacing: '0.5px' }}>
              ⚽&nbsp;48 Nations&nbsp;&nbsp;·&nbsp;&nbsp;
              🏟️&nbsp;104 Matches&nbsp;&nbsp;·&nbsp;&nbsp;
              🧠&nbsp;2,400+ Scouts&nbsp;&nbsp;·&nbsp;&nbsp;
              📅&nbsp;Jun 11 → Jul 19, 2026&nbsp;&nbsp;·&nbsp;&nbsp;
              🇺🇸&nbsp;USA&nbsp;·&nbsp;🇨🇦&nbsp;Canada&nbsp;·&nbsp;🇲🇽&nbsp;Mexico
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 2 — MATCHDAY INTELLIGENCE
      ══════════════════════════════════════ */}
      <section
        id="fixtures"
        className="py-24"
        style={{ background: 'rgba(0,0,0,0.75)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-[1400px] mx-auto px-7">
          <p className="font-mono uppercase mb-3" style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--red)' }}>
            // MATCHDAY INTELLIGENCE
          </p>
          <h2 className="font-display font-semibold mb-12" style={{ fontSize: 'clamp(32px, 4.5vw, 48px)' }}>
            Live Data. Before the Whistle.
          </h2>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── Panel 1: Upcoming Matches ── */}
            <div
              className="rounded-xl p-6 flex flex-col gap-4"
              style={{ background: 'rgba(10,25,15,0.82)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold" style={{ fontSize: '18px' }}>Upcoming Matches</h3>
                <a href="/matches" className="font-mono text-[10px] tracking-widest uppercase transition-colors" style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  All →
                </a>
              </div>

              <div className="flex flex-col gap-3">
                {(upcoming.length > 0 ? upcoming : [FALLBACK_MATCH]).map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3 transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(255,45,85,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; }}
                  >
                    <p className="font-mono text-[10px] tracking-wider uppercase mb-2" style={{ color: 'var(--muted)' }}>
                      {m.group}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: '20px' }}>{m.home_flag}</span>
                        <span className="font-sans font-semibold text-[13px]">{m.home_team}</span>
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>vs</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans font-semibold text-[13px]">{m.away_team}</span>
                        <span style={{ fontSize: '20px' }}>{m.away_flag}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-sans text-[11px]" style={{ color: 'rgba(240,247,240,0.38)' }}>
                        {new Date(m.kickoff).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => handlePredict(m.id)}
                        className="font-mono text-[10px] tracking-wider uppercase transition-colors"
                        style={{ background: 'none', border: 'none', color: 'var(--red)' }}
                      >
                        Predict →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Panel 2: Group Standings ── */}
            <div
              className="rounded-xl p-6 flex flex-col gap-4"
              style={{ background: 'rgba(10,25,15,0.82)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
            >
              <h3 className="font-display font-semibold" style={{ fontSize: '18px' }}>Group Standings</h3>

              {/* Group tabs */}
              <div className="flex gap-1 flex-wrap">
                {Object.keys(WC2026_GROUPS).map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className="font-mono text-[10px] tracking-wider px-2.5 py-1.5 rounded transition-all duration-200"
                    style={{
                      background: selectedGroup === g ? 'var(--red)' : 'rgba(255,255,255,0.04)',
                      color:      selectedGroup === g ? '#fff' : 'var(--muted)',
                      border:     `1px solid ${selectedGroup === g ? 'var(--red)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_repeat(4,28px)] gap-x-2 items-center pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'rgba(240,247,240,0.3)', width: '20px' }}>#</span>
                <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'rgba(240,247,240,0.3)' }}>Team</span>
                {['P','W','D','Pts'].map(h => (
                  <span key={h} className="font-mono text-[9px] tracking-widest uppercase text-center" style={{ color: 'rgba(240,247,240,0.3)' }}>{h}</span>
                ))}
              </div>

              {/* Teams */}
              <div className="flex flex-col gap-2">
                {(WC2026_GROUPS[selectedGroup] ?? []).map((team, i) => (
                  <div key={team.name} className="grid grid-cols-[auto_1fr_repeat(4,28px)] gap-x-2 items-center py-1.5">
                    <span
                      className="font-mono text-[11px] font-bold text-center"
                      style={{ width: '20px', color: i < 2 ? 'var(--gold)' : 'var(--muted)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '16px' }}>{team.flag}</span>
                      <span className="font-sans font-semibold text-[13px]" style={{ color: i < 2 ? 'var(--text)' : 'var(--muted)' }}>
                        {team.name}
                      </span>
                    </div>
                    {[0, 0, 0, 0].map((v, j) => (
                      <span key={j} className="font-mono text-[12px] text-center" style={{ color: 'var(--muted)' }}>{v}</span>
                    ))}
                  </div>
                ))}
              </div>

              <p className="font-mono text-[9px] uppercase mt-auto" style={{ color: 'rgba(240,247,240,0.25)', letterSpacing: '1px' }}>
                · Tournament begins Jun 11 · All stats pending ·
              </p>
            </div>

            {/* ── Panel 3: AI Tactical Pulse ── */}
            <div
              className="rounded-xl p-6 flex flex-col gap-4"
              style={{ background: 'rgba(10,25,15,0.82)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold" style={{ fontSize: '18px' }}>⚡ AI Tactical Pulse</h3>
                <button
                  onClick={refreshBrief}
                  disabled={briefLoading}
                  className="font-mono text-[10px] tracking-widest uppercase transition-colors"
                  style={{ background: 'none', border: 'none', color: briefLoading ? 'rgba(240,247,240,0.2)' : 'var(--muted)' }}
                  onMouseEnter={e => { if (!briefLoading) e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = briefLoading ? 'rgba(240,247,240,0.2)' : 'var(--muted)'; }}
                >
                  {briefLoading ? 'Thinking…' : '↺ Refresh'}
                </button>
              </div>

              <div
                className="rounded-lg p-4 flex-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minHeight: '140px' }}
              >
                {briefLoading ? (
                  <div className="flex flex-col gap-2 animate-pulse">
                    {[1, 0.7, 0.85].map((w, i) => (
                      <div key={i} className="h-3 rounded" style={{ background: 'rgba(255,255,255,0.06)', width: `${w * 100}%` }} />
                    ))}
                  </div>
                ) : (
                  <p className="font-sans" style={{ fontSize: '14px', color: 'rgba(240,247,240,0.78)', lineHeight: 1.8 }}>
                    {dailyBrief}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto">
                <a
                  href="/nation"
                  className="font-mono text-[10px] tracking-widest uppercase transition-colors"
                  style={{ color: 'var(--red)', textDecoration: 'none' }}
                >
                  Nation Intel →
                </a>
                <span className="font-mono text-[9px]" style={{ color: 'rgba(240,247,240,0.22)', letterSpacing: '1px' }}>
                  Powered by Groq · Llama 3.3 70B
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 3 — HOW IT WORKS
      ══════════════════════════════════════ */}
      <section
        id="about"
        className="py-24"
        style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-[1400px] mx-auto px-7">
          <p className="font-mono uppercase mb-3" style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--red)' }}>
            // HOW IT WORKS
          </p>
          <h2 className="font-display font-semibold mb-14" style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}>
            Three steps to scout glory
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl p-8 flex flex-col gap-5 transition-all duration-500"
                style={{ background: 'rgba(10,25,15,0.82)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
                onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(255,45,85,0.3)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(255,45,85,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '36px' }}>{step.icon}</span>
                  <span className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'var(--muted)' }}>0{i + 1}</span>
                </div>
                <h3 className="font-display font-semibold" style={{ fontSize: '22px' }}>{step.title}</h3>
                <p className="font-sans" style={{ fontSize: '14px', color: 'rgba(240,247,240,0.62)', lineHeight: 1.75 }}>{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-14">
            <button
              onClick={() => handlePredict()}
              className="font-sans font-bold rounded-lg transition-all duration-300"
              style={{ background: 'var(--red)', color: '#fff', fontSize: '15px', padding: '16px 40px', boxShadow: '0 0 24px rgba(255,45,85,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ff4d6d'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--red)'; }}
            >
              🏆 Join Free — Start Predicting
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 4 — LEADERBOARD PREVIEW
      ══════════════════════════════════════ */}
      <section
        id="leaderboard"
        className="py-24"
        style={{ background: 'rgba(0,0,0,0.75)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-[1400px] mx-auto px-7">
          <p className="font-mono uppercase mb-3" style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--red)' }}>
            // GLOBAL SCOUT RANKINGS
          </p>
          <h2 className="font-display font-semibold mb-3" style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}>
            The Best Minds in Football
          </h2>
          <p className="font-sans mb-12" style={{ fontSize: '15px', color: 'var(--muted)' }}>
            2,400+ scouts competing for tactical supremacy.
          </p>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-[48px_1fr_auto_auto_auto] gap-x-4 items-center px-6 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              {['Rank', 'Scout', 'Nation', 'IQ Score', 'Title'].map(h => (
                <span key={h} className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(240,247,240,0.3)' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {leaderboard.map((entry, i) => (
              <div
                key={entry.username}
                className="grid grid-cols-[48px_1fr_auto_auto_auto] gap-x-4 items-center px-6 py-4 transition-all duration-200"
                style={{
                  borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: i < 3 ? `rgba(255,45,85,${0.02 - i * 0.005})` : 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = i < 3 ? `rgba(255,45,85,${0.02 - i * 0.005})` : 'transparent'; }}
              >
                <span className="font-mono text-[18px] text-center">
                  {RANK_MEDALS[entry.rank] ?? entry.rank}
                </span>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-display font-semibold flex-shrink-0"
                    style={{ background: 'rgba(255,45,85,0.15)', color: 'var(--red)', fontSize: '14px', border: '1px solid rgba(255,45,85,0.2)' }}
                  >
                    {entry.username[0].toUpperCase()}
                  </div>
                  <span className="font-sans font-semibold" style={{ fontSize: '14px' }}>{entry.username}</span>
                </div>
                <span style={{ fontSize: '18px' }}>{entry.country_allegiance}</span>
                <span className="font-display font-semibold" style={{ fontSize: '16px', color: 'var(--gold)' }}>
                  {entry.football_iq_points.toLocaleString()}
                </span>
                <span
                  className="font-mono text-[10px] tracking-wider uppercase px-2 py-1 rounded hidden sm:block"
                  style={{ background: 'rgba(255,45,85,0.1)', color: 'var(--red)', border: '1px solid rgba(255,45,85,0.2)' }}
                >
                  {entry.rank_title}
                </span>
              </div>
            ))}

            {/* Blurred "more" hint */}
            <div
              className="px-6 py-3 flex items-center justify-center gap-2"
              style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="flex -space-x-2">
                {['🧢','🎯','⚡','🦁'].map((e, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>{e}</div>
                ))}
              </div>
              <span className="font-sans text-[13px]" style={{ color: 'var(--muted)' }}>
                + 2,395 more scouts competing
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-10">
            <button
              onClick={() => user ? router.push('/leaderboard') : router.push('/login')}
              className="font-sans font-bold rounded-lg transition-all duration-300"
              style={{ background: 'var(--red)', color: '#fff', fontSize: '15px', padding: '14px 36px', boxShadow: '0 0 20px rgba(255,45,85,0.28)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ff4d6d'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--red)'; }}
            >
              {user ? 'View Full Leaderboard' : 'Join Free — See Where You Rank'}
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 5 — FEATURE HIGHLIGHTS
      ══════════════════════════════════════ */}
      <section
        id="features"
        className="py-24"
        style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-[1400px] mx-auto px-7">
          <p className="font-mono uppercase mb-3" style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--red)' }}>
            // BUILT FOR REAL FOOTBALL MINDS
          </p>
          <h2 className="font-display font-semibold mb-14" style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}>
            Every tool a scout needs.
          </h2>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Card 1 — Tactical XI Builder */}
            <div
              className="rounded-xl p-7 flex flex-col gap-6 transition-all duration-500"
              style={{ background: 'rgba(10,25,15,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
              onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(255,45,85,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; }}
            >
              <div className="flex justify-center py-2">
                <MiniPitch />
              </div>
              <div>
                <p className="font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--red)' }}>Tactical XI Builder</p>
                <h3 className="font-display font-semibold mb-3" style={{ fontSize: '20px' }}>Drag. Drop. Lock.</h3>
                <p className="font-sans" style={{ fontSize: '14px', color: 'rgba(240,247,240,0.6)', lineHeight: 1.75 }}>
                  Build your XI in minutes before every match. Set formation, pick captain, lock your prediction.
                </p>
              </div>
              <button
                onClick={() => handlePredict()}
                className="font-sans font-semibold text-[13px] transition-all duration-300 rounded-lg py-2.5 mt-auto"
                style={{ background: 'rgba(255,45,85,0.12)', color: 'var(--red)', border: '1px solid rgba(255,45,85,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,45,85,0.12)'; }}
              >
                Try the Predictor →
              </button>
            </div>

            {/* Card 2 — AI Tactical Coach */}
            <div
              className="rounded-xl p-7 flex flex-col gap-6 transition-all duration-500"
              style={{ background: 'rgba(10,25,15,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
              onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(0,209,255,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; }}
            >
              {/* Chat bubble preview */}
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-start gap-2">
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>👤</span>
                  <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p className="font-sans text-[12px]" style={{ color: 'var(--muted)' }}>What formation should I predict for Brazil?</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>🤖</span>
                  <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(0,209,255,0.07)', border: '1px solid rgba(0,209,255,0.12)' }}>
                    <p className="font-sans text-[12px]" style={{ color: 'rgba(240,247,240,0.8)', lineHeight: 1.7 }}>
                      Brazil&apos;s likely 4-2-3-1 exploits wide channels with Vinicius Jr&apos;s pace. Watch for Rodrygo drifting inside from the right to create overloads…
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--blue)' }}>AI Tactical Coach</p>
                <h3 className="font-display font-semibold mb-3" style={{ fontSize: '20px' }}>Ask anything.</h3>
                <p className="font-sans" style={{ fontSize: '14px', color: 'rgba(240,247,240,0.6)', lineHeight: 1.75 }}>
                  Get tactical answers powered by Llama 3.3 70B. Formations, scouting reports, live breakdowns.
                </p>
              </div>
              <a
                href="/ai"
                className="font-sans font-semibold text-[13px] transition-all duration-300 rounded-lg py-2.5 mt-auto text-center"
                style={{ background: 'rgba(0,209,255,0.08)', color: 'var(--blue)', border: '1px solid rgba(0,209,255,0.15)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,209,255,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,209,255,0.08)'; }}
              >
                Ask the AI Coach →
              </a>
            </div>

            {/* Card 3 — Nation Intel */}
            <div
              className="rounded-xl p-7 flex flex-col gap-6 transition-all duration-500"
              style={{ background: 'rgba(10,25,15,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
              onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(255,210,63,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; }}
            >
              {/* 48 flag grid */}
              <div className="py-2">
                <div className="grid gap-y-2" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
                  {Object.values(WC2026_GROUPS).flat().map(t => (
                    <span key={t.name} className="text-center" style={{ fontSize: '20px' }}>{t.flag}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--gold)' }}>Nation Intel</p>
                <h3 className="font-display font-semibold mb-3" style={{ fontSize: '20px' }}>48 squads. One hub.</h3>
                <p className="font-sans" style={{ fontSize: '14px', color: 'rgba(240,247,240,0.6)', lineHeight: 1.75 }}>
                  Deep dive into every WC 2026 squad. Formations, key players, news feeds, AI scout reports.
                </p>
              </div>
              <a
                href="/nation"
                className="font-sans font-semibold text-[13px] transition-all duration-300 rounded-lg py-2.5 mt-auto text-center"
                style={{ background: 'rgba(255,210,63,0.08)', color: 'var(--gold)', border: '1px solid rgba(255,210,63,0.2)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,210,63,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,210,63,0.08)'; }}
              >
                Explore Nations →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION 6 — URGENCY BANNER
      ══════════════════════════════════════ */}
      <section
        className="py-24 relative overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.85)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Red glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(255,45,85,0.06) 0%, transparent 70%)' }} />

        <div className="relative z-10 max-w-[1400px] mx-auto px-7">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT — WC countdown */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="font-mono uppercase mb-3" style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--red)' }}>
                  ⏰ WORLD CUP KICKS OFF
                </p>
                <h2 className="font-display font-semibold" style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}>
                  June 11, 2026
                </h2>
              </div>
              <CountdownGrid cd={wcCountdown} large />
              <p className="font-sans" style={{ fontSize: '15px', color: 'var(--muted)' }}>
                Lock in your predictions before kickoff. Every minute counts.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handlePredict()}
                  className="font-sans font-bold rounded-lg transition-all duration-300"
                  style={{ background: 'var(--red)', color: '#fff', fontSize: '15px', padding: '14px 32px', boxShadow: '0 0 24px rgba(255,45,85,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ff4d6d'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--red)'; }}
                >
                  🏆 Create Your Free Account
                </button>
                <button
                  onClick={() => router.push('/matches')}
                  className="font-sans font-semibold rounded-lg transition-all duration-300"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text)', fontSize: '15px', padding: '14px 32px', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  👀 Explore Without Account
                </button>
              </div>
              <p className="font-sans text-[12px]" style={{ color: 'rgba(240,247,240,0.3)' }}>
                Free forever · No credit card · Takes 2 minutes
              </p>
            </div>

            {/* RIGHT — Mock scout cards */}
            <div className="flex flex-col gap-4">
              <p className="font-mono uppercase mb-2" style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--muted)' }}>
                Top scouts already predicting:
              </p>
              {MOCK_SCOUTS.map(scout => (
                <div
                  key={scout.username}
                  className="rounded-xl p-5 flex items-center gap-4"
                  style={{ background: 'rgba(10,25,15,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,45,85,0.12)', fontSize: '24px', border: '1px solid rgba(255,45,85,0.2)' }}
                  >
                    {scout.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-semibold text-[14px] truncate">{scout.username}</span>
                      <span style={{ fontSize: '16px' }}>{scout.nation}</span>
                    </div>
                    <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--muted)', letterSpacing: '0.5px' }}>
                      {scout.formation} · Locked ✓
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-semibold" style={{ fontSize: '18px', color: 'var(--gold)' }}>
                      {scout.iq.toLocaleString()}
                    </p>
                    <p className="font-mono text-[9px]" style={{ color: 'var(--muted)', letterSpacing: '1px' }}>IQ PTS</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="py-12" style={{ background: 'rgba(0,0,0,0.9)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1400px] mx-auto px-7">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="font-display font-semibold mb-1.5" style={{ fontSize: '34px', letterSpacing: '-1px' }}>
                Fan<span style={{ color: 'var(--gold)' }}>XI</span>
              </div>
              <p className="font-sans text-[13px]" style={{ color: 'var(--muted)' }}>World Cup 2026 Tactical Hub</p>
            </div>
            <div className="flex flex-wrap gap-x-7 gap-y-3">
              {[
                { label: 'Fixtures',     href: '/matches'     },
                { label: 'Leaderboard', href: '/leaderboard' },
                { label: 'Nation Intel', href: '/nation'     },
                { label: 'AI Coach',    href: '/ai'          },
                { label: 'Guide',       href: '/guide'       },
              ].map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  className="font-sans font-semibold text-[13px] transition-colors"
                  style={{ color: 'var(--muted)', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div className="flex gap-5">
              {[{ label: 'X / Twitter', href: 'https://x.com' }, { label: 'GitHub', href: 'https://github.com' }].map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono uppercase transition-colors"
                  style={{ fontSize: '11px', letterSpacing: '1px', color: 'var(--muted)', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-sans text-[12px]" style={{ color: 'rgba(122,170,122,0.45)' }}>© 2026 FanXI · World Cup Tactical Hub</p>
            <p className="font-mono uppercase" style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(122,170,122,0.3)' }}>Free Forever · No Credit Card</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
