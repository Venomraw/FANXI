'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PitchBoard from "@/src/components/pitch/PitchBoard";
import Countdown from "@/src/components/hub/Countdown";
import UserStats from "@/src/components/hub/UserStats";
import MiniLeaderboard from "@/src/components/hub/MiniLeaderboard";
import { useTheme } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/context/AuthContext";

const TICKER_ITEMS = [
  '⚽ WORLD CUP 2026 — JUNE 11 → JULY 19',
  '🏟️ AT&T STADIUM — ARLINGTON TX',
  '🏆 BUILD YOUR SQUAD NOW',
  '💰 $100M SALARY CAP',
  '🎯 48 TEAMS · 64 MATCHES',
  '⚡ FANXI TACTICAL PREDICTIONS LIVE',
  '🧠 SET YOUR TACTICAL HAKI',
  '🌎 FREE-TO-PLAY GLOBAL LEAGUES',
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

const DALLAS_MATCHES = [
  { date: 'JUN 12', teams: 'Group Stage — Match 1', type: 'Group Phase', gold: false },
  { date: 'JUN 16', teams: 'Group Stage — Match 2', type: 'Group Phase', gold: false },
  { date: 'JUN 20', teams: 'Group Stage — Match 3', type: 'Group Phase', gold: false },
  { date: 'JUL 6',  teams: 'Round of 16',           type: 'Knockout',    gold: false },
  { date: 'JUL 14', teams: '⭐ SEMI-FINAL',          type: 'Semi-Final',  gold: true  },
];

export default function Home() {
  const { team, primary, setShowPicker } = useTheme();
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const tickerFull = [...TICKER_ITEMS, ...TICKER_ITEMS].join('  ·  ');

  return (
    <div className="flex min-h-screen flex-col font-sans" style={{ background: 'var(--dark)', color: 'var(--text)' }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 w-full border-b theme-transition glass-panel" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-[1200px] mx-auto px-7 py-[18px] flex items-center justify-between gap-4">

          {/* Logo */}
          <h1
            className="font-display font-semibold text-[18px] tracking-[0.6px] leading-none theme-transition cursor-pointer"
            onClick={() => router.push('/')}
            style={{ color: primary }}
          >
            Fan<span style={{ color: 'var(--gold)' }}>XI</span>
            <span className="font-mono text-[11px] tracking-[1px] ml-2 align-middle" style={{ color: 'var(--muted)' }}>HUB</span>
          </h1>

          {/* Nav links — hidden on small screens */}
          <ul className="hidden lg:flex items-center list-none">
            {[
              ['Guide',    '/guide'    ],
              ['Leagues',  '#leagues'  ],
              ['Dallas',   '#dallas'   ],
              ['Intel',    '/nation'   ],
            ].map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  className="block px-4 py-2 font-sans font-semibold text-[13px] transition-all rounded-sm"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = primary; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Right nav */}
          <div className="flex items-center gap-2">
            {team && (
              <button
                onClick={() => router.push('/nation')}
                className="flex items-center gap-2 px-3 py-2 border transition-all font-sans font-semibold text-[13px]"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = primary; (e.currentTarget as HTMLButtonElement).style.color = primary; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
              >
                <span>{team.flag}</span>
                <span className="hidden sm:inline">Intel</span>
              </button>
            )}

            {team && (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-2 px-3 py-2 border theme-transition"
                style={{ background: `${primary}18`, borderColor: primary, color: primary }}
              >
                <span className="text-base leading-none">{team.flag}</span>
                <span className="font-sans font-semibold text-[13px] hidden sm:block">{team.shortName}</span>
                <span className="text-xs opacity-50">✎</span>
              </button>
            )}

            {/* User chip */}
            <div className="flex items-center gap-3 px-3 py-2 border" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.04)' }}>
              <div className="hidden sm:block text-right">
                <div className="font-bold text-sm leading-tight" style={{ color: 'var(--text)' }}>{user.username}</div>
                <div className="font-mono text-[10px] tracking-wider uppercase leading-tight theme-transition" style={{ color: primary }}>
                  {user.rank_title} · {user.football_iq_points} pts
                </div>
              </div>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="hover:text-red-400 transition-colors text-base leading-none"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                title="Logout"
              >⏻</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative flex flex-col justify-center overflow-hidden"
        style={{
          minHeight: '85vh',
          paddingTop: '120px',
          paddingBottom: '80px',
          background: 'radial-gradient(ellipse 120% 60% at 60% 0%, #0d2010 0%, var(--dark) 70%)',
        }}
      >
        {/* Animated grid BG */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(0,232,124,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,232,124,0.04) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Gold orb */}
        <div
          className="absolute right-0 top-1/4 pointer-events-none hidden lg:block"
          style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255,210,63,0.06), transparent 70%)', borderRadius: '50%' }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto w-full px-7">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-5 theme-transition" style={{ color: primary }}>
            ⚡ FIFA World Cup 2026 — June 11 → July 19 · Dallas, Texas
          </div>

          <h1
            className="font-display font-semibold leading-none mb-8"
            style={{ fontSize: 'clamp(72px, 12vw, 180px)', letterSpacing: '-1px', lineHeight: '0.88' }}
          >
            BUILD YOUR<br />
            <span style={{ color: primary }}>DREAM SQUAD</span><br />
            <span
              className="font-sans"
              style={{ fontSize: '28%', letterSpacing: '0.5px', color: 'var(--gold)', lineHeight: '3' }}
            >
              48 Teams · 100+ Players · 1 Champion
            </span>
          </h1>

          <p className="text-[15px] leading-relaxed mb-10 max-w-lg" style={{ color: 'var(--muted)' }}>
            The most competitive fantasy football platform for the World Cup. Salary cap strategy, live scoring, private leagues — plus FanXI tactical predictions. Starting from Dallas, Texas.
          </p>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-8 py-4 font-sans font-semibold text-[13px] transition-all hover:-translate-y-0.5 glow-primary"
              style={{ background: primary, color: 'var(--dark)', clipPath: 'polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))' }}
            >
              ⚽ Build Your XI
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="flex items-center gap-2 px-8 py-4 font-sans font-semibold text-[13px] border transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = primary; (e.currentTarget as HTMLButtonElement).style.color = primary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>

        {/* Hero stats — absolute right */}
        <div className="absolute right-12 bottom-16 hidden xl:flex flex-col gap-8">
          {[
            { num: '48',    label: 'Nations'    },
            { num: '$100M', label: 'Budget Cap' },
            { num: '15',    label: 'Players'    },
            { num: '2.4K',  label: 'Scouts'     },
          ].map(s => (
            <div key={s.label} className="text-right">
              <div className="font-display font-semibold leading-none theme-transition" style={{ fontSize: '44px', lineHeight: '1', color: primary }}>{s.num}</div>
              <div className="font-mono text-[9px] tracking-widest uppercase mt-1" style={{ color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="w-full overflow-hidden relative z-10 py-3 theme-transition" style={{ background: primary, color: 'var(--dark)' }}>
        <div className="ticker-inner font-mono font-bold text-[11px] tracking-widest uppercase">
          {tickerFull} &nbsp;&nbsp; {tickerFull}
        </div>
      </div>

      {/* ── GUIDE CTA ── */}
      <section className="py-14 border-t border-b" style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1200px] mx-auto px-7 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase mb-2" style={{ color: primary }}>// New to FanXI?</div>
            <h2 className="font-display font-semibold leading-none" style={{ fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '1px' }}>
              Read the <span style={{ color: primary }}>Scout Manual</span>
            </h2>
            <p className="text-[13px] mt-2" style={{ color: 'var(--muted)' }}>How to play · Scoring rules · Rank system · Pro tips</p>
          </div>
          <button
            onClick={() => router.push('/guide')}
            className="flex-shrink-0 flex items-center gap-2 px-8 py-4 font-sans font-semibold text-[13px] transition-all hover:-translate-y-0.5 btn-cut btn-shimmer"
            style={{ background: primary, color: 'var(--dark)', boxShadow: `0 0 20px color-mix(in srgb, ${primary} 35%, transparent)` }}
          >
            Open Guide →
          </button>
        </div>
      </section>

      {/* ── PITCH BUILDER (main interactive section) ── */}
      <section id="builder" className="py-24" style={{ background: 'var(--dark)' }}>
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: primary }}>// Tactical Engine</div>
          <h2
            className="font-display font-semibold mb-10 leading-none"
            style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            YOUR <span style={{ color: primary }}>XI</span>
          </h2>
          <main><PitchBoard /></main>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <UserStats />
            <MiniLeaderboard />
          </div>
        </div>
      </section>

      {/* ── COUNTDOWN ── */}
      <section className="py-20 border-t border-b" style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1200px] mx-auto px-7">
          <Countdown />
        </div>
      </section>


      {/* ── LEAGUES ── */}
      <section id="leagues" className="py-24" style={{ background: 'var(--dark3)' }}>
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: primary }}>// Competition</div>
          <h2
            className="font-display font-semibold mb-14 leading-none"
            style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            LEAGUE<br />FORMATS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {LEAGUES.map(league => (
              <div
                key={league.title}
                className="relative p-10 border transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ background: 'var(--dark)', borderColor: league.featured ? 'rgba(255,210,63,0.3)' : 'var(--border)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = league.featured ? 'var(--gold)' : primary)}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = league.featured ? 'rgba(255,210,63,0.3)' : 'var(--border)')}
              >
                {league.featured && (
                  <span
                    className="absolute top-4 right-4 font-mono text-[8px] font-bold tracking-wide uppercase px-2 py-1"
                    style={{ background: 'var(--gold)', color: 'var(--dark)' }}
                  >⭐ Popular</span>
                )}
                <div className="text-4xl mb-4">{league.icon}</div>
                <h3 className="font-display font-semibold mb-3 tracking-wide" style={{ fontSize: '28px', letterSpacing: '1px' }}>{league.title}</h3>
                <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'var(--muted)' }}>{league.desc}</p>
                <div className="flex gap-3 flex-wrap">
                  {league.meta.map(m => (
                    <span key={m} className="font-mono text-[9px] tracking-wide" style={{ color: primary }}>{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DALLAS ── */}
      <section
        id="dallas"
        className="py-24 border-t border-b overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--dark) 0%, #0D1A06 50%, var(--dark) 100%)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 mb-5 font-mono text-[9px] tracking-widest uppercase border"
              style={{ background: 'rgba(255,210,63,0.08)', borderColor: 'rgba(255,210,63,0.25)', color: 'var(--gold)' }}
            >
              📍 Host City — Dallas / Fort Worth
            </div>
            <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: primary }}>// Local Advantage</div>
            <h2
              className="font-display font-semibold leading-none mb-5"
              style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
            >
              AT&T<br />STADIUM<br />
              <span style={{ color: 'var(--gold)' }}>ARLINGTON</span>
            </h2>
            <p className="text-[14px] leading-relaxed max-w-md" style={{ color: 'var(--muted)' }}>
              Nine World Cup matches, including a Semi-Final. Dallas is at the heart of the tournament. Join a{' '}
              <strong style={{ color: primary }}>DFW-only mini-league</strong> and prove your local supremacy.
            </p>
          </div>

          {/* Right: match schedule */}
          <div className="flex flex-col gap-2.5">
            <div className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: primary }}>AT&T STADIUM SCHEDULE</div>
            {DALLAS_MATCHES.map(match => (
              <div
                key={match.date}
                className="flex items-center gap-4 px-5 py-3.5 border transition-colors duration-200"
                style={{
                  background: 'var(--dark3)',
                  borderColor: match.gold ? 'rgba(255,210,63,0.3)' : 'var(--border)',
                }}
              >
                <div className="font-mono text-[9px] tracking-wide min-w-[56px]" style={{ color: 'var(--gold)' }}>{match.date}</div>
                <div className="flex-1 text-sm font-bold">{match.teams}</div>
                <div className="font-mono text-[8px] tracking-wide uppercase" style={{ color: match.gold ? 'var(--gold)' : 'var(--muted)' }}>{match.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pt-14 pb-9 border-t" style={{ background: 'var(--dark)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-14 mb-14">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="font-display font-semibold text-4xl mb-3 tracking-wider" style={{ color: primary }}>
                Fan<span style={{ color: 'var(--gold)' }}>XI</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                The ultimate tactical prediction platform for the 2026 FIFA World Cup. Built for fans who think like coaches — from Dallas, Texas.
              </p>
            </div>

            {/* Platform links */}
            <div>
              <div className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: primary }}>Platform</div>
              <ul className="space-y-2">
                {[
                  ['Team Builder',  '#builder'],
                  ['Leaderboard',   '/leaderboard'],
                  ['Leagues',       '#leagues'],
                  ['Scoring',       '#scoring'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-[13px] transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                    >{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Info links */}
            <div>
              <div className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: primary }}>Info</div>
              <ul className="space-y-2">
                {[
                  ['Scoring Rules',  '#scoring'],
                  ['Fixtures',       '#dallas'],
                  ['How It Works',   '#how-it-works'],
                  ['Nation Intel',   '/nation'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-[13px] transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                    >{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dev links */}
            <div>
              <div className="font-mono text-[9px] tracking-widest uppercase mb-4" style={{ color: primary }}>Dev</div>
              <ul className="space-y-2">
                {([
                  { label: 'GitHub ↗',      href: 'https://github.com/venomraw',                            external: true  },
                  { label: 'LinkedIn ↗',    href: 'https://www.linkedin.com/in/binamra-sigdel-377553156/', external: true  },
                  { label: 'MIT License',   href: '#',                                                      external: false },
                  { label: 'Privacy Policy',href: '#',                                                      external: false },
                ] as { label: string; href: string; external: boolean }[]).map(({ label, href, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="text-[13px] transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                    >{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer bottom bar */}
          <div className="flex justify-between items-center pt-7 border-t flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
            <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--muted)' }}>
              © 2026 FanXI · Built by Venomraw · Free-to-play · Not affiliated with FIFA.
            </span>
            <span className="font-mono text-[10px] tracking-wider" style={{ color: primary }}>
              DALLAS · TEXAS · USA 🏟️
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
