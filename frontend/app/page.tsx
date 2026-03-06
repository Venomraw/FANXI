'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PitchBoard from "@/src/components/pitch/PitchBoard";
import UserStats from "@/src/components/hub/UserStats";
import MiniLeaderboard from "@/src/components/hub/MiniLeaderboard";
import NavBar from "@/src/components/NavBar";
import { useTheme } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/context/AuthContext";


const TICKER_ITEMS = [
  '⚽ WORLD CUP 2026 — JUNE 11 → JULY 19',
  '🌎 USA · CANADA · MEXICO — 48 NATIONS · 104 MATCHES',
  '🧠 PREDICT THE STARTING XI',
  '⚡ LOCK YOUR PREDICTION 1H BEFORE KICKOFF',
  '🎯 48 NATIONS · 104 MATCHES',
  '🤖 AI SCORES YOUR FOOTBALL IQ IN REAL TIME',
  '🔄 HALF-TIME PREDICTIONS — SUBS & TACTICS',
  '🌎 FREE-TO-PLAY · NO CREDIT CARD',
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


export default function Home() {
  const { team, primary } = useTheme();
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (isLoading || !user) return null;

  const tickerFull = [...TICKER_ITEMS, ...TICKER_ITEMS].join('  ·  ');

  return (
    <div className="flex min-h-screen flex-col font-sans" style={{ background: 'transparent', color: 'var(--text)' }}>

      <NavBar subtitle="HUB" />

      {/* ── HERO ── */}
      <section
        className="relative flex flex-col justify-center overflow-hidden"
        style={{
          minHeight: 'auto',
          paddingTop: '20px',
          paddingBottom: '100px',
          background: 'transparent',
        }}
      >
        {/* Animated grid BG */}
        <div className="grid-bg-primary absolute inset-0 pointer-events-none" />
        {/* Gold orb */}
        <div
          className="absolute right-0 top-1/4 pointer-events-none hidden lg:block"
          style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255,210,63,0.06), transparent 70%)', borderRadius: '50%' }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto w-full px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-16 items-center">

            {/* ── Left: title + body + CTAs ── */}
            <div>
              <div className="font-mono text-[11px] tracking-widest uppercase mb-7 theme-transition" style={{ color: primary }}>
                ⚡ FIFA World Cup 2026 — June 11 → July 19 · USA · Canada · Mexico
              </div>

              <h1
                className="font-display font-semibold leading-none mb-6"
                style={{ fontSize: 'clamp(72px, 10vw, 160px)', letterSpacing: '-1px', lineHeight: '0.88' }}
              >
                PREDICT THE<br />
                <span style={{ color: primary }}>STARTING XI</span>
              </h1>

              <p
                className="font-sans font-semibold mb-10"
                style={{ fontSize: 'clamp(16px, 1.4vw, 20px)', letterSpacing: '0.5px', color: 'var(--gold)' }}
              >
                48 Nations · 104 Matches · 1 World Cup
              </p>

              <p className="text-[15px] leading-relaxed mb-12 max-w-lg" style={{ color: 'var(--muted)' }}>
                The world's first tactical prediction platform for the World Cup. Predict lineups, formations, tactics and match stats — then watch AI score your football IQ in real time.
              </p>

              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 px-8 py-4 font-sans font-semibold text-[13px] transition-all hover:-translate-y-0.5 glow-primary"
                  style={{ background: primary, color: 'var(--dark)', clipPath: 'polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))' }}
                >
                  ⚽ Make Your Prediction
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

            {/* ── Right: stats panel ── */}
            <div
              className="hidden lg:grid grid-cols-2 gap-px border theme-transition"
              style={{ borderColor: 'var(--border)', background: 'var(--border)' }}
            >
              {[
                { num: '48',   label: 'Nations'       },
                { num: '104',  label: 'Matches'       },
                { num: '1.1K', label: 'Players'       },
                { num: '2.4K', label: 'Scouts'        },
              ].map(s => (
                <div
                  key={s.label}
                  className="flex flex-col justify-center items-center py-10 theme-transition"
                  style={{ background: 'var(--dark3)', transition: 'background 0.3s ease' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = `color-mix(in srgb, ${primary} 8%, var(--dark3))`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--dark3)';
                  }}
                >
                  <div
                    className="font-display font-semibold leading-none theme-transition"
                    style={{ fontSize: 'clamp(36px, 3.5vw, 52px)', lineHeight: '1', color: primary }}
                  >
                    {s.num}
                  </div>
                  <div className="font-mono text-[10px] tracking-widest uppercase mt-2 text-center" style={{ color: 'var(--muted)' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="w-full overflow-hidden relative z-10 py-3 theme-transition" style={{ background: primary, color: 'var(--dark)' }}>
        <div className="ticker-inner font-mono font-bold text-[11px] tracking-widest uppercase">
          {tickerFull} &nbsp;&nbsp; {tickerFull}
        </div>
      </div>

      {/* ── GUIDE CTA ── */}
      <section className="py-14 border-t border-b" style={{ background: 'rgba(5, 13, 8, 0.75)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-7 flex flex-col sm:flex-row items-center justify-between gap-6">
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

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 border-b overflow-hidden" style={{ background: 'rgba(5, 13, 8, 0.6)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-7">

          {/* Header */}
          <div className="mb-16 reveal">
            <div className="font-mono text-[11px] tracking-widest uppercase mb-3 theme-transition" style={{ color: primary }}>
              // Match Day Experience
            </div>
            <h2
              className="font-display font-semibold leading-none"
              style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
            >
              HOW IT<br /><span style={{ color: primary }}>WORKS</span>
            </h2>
          </div>

          {/* Timeline bar — desktop only */}
          <div className="hidden lg:flex items-center mb-10 relative">
            <div className="absolute left-0 right-0 h-px" style={{ background: 'var(--border)', top: '50%' }} />
            {[
              { phase: 'PRE-MATCH', time: '-1h 05m', color: primary },
              { phase: 'HALF-TIME', time: "45'",     color: 'var(--gold)' },
              { phase: 'FULL-TIME', time: "90'+",    color: 'var(--blue)' },
            ].map((p, i) => (
              <div key={p.phase} className="relative flex-1 flex flex-col items-center gap-2">
                {/* Dot */}
                <div
                  className="w-3 h-3 rounded-full border-2 z-10 theme-transition"
                  style={{ background: 'var(--dark)', borderColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
                />
                <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: p.color }}>
                  {p.phase}
                </span>
                <span className="font-display font-semibold" style={{ fontSize: '22px', color: p.color }}>
                  {p.time}
                </span>
              </div>
            ))}
          </div>

          {/* Phase cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>

            {/* PRE-MATCH */}
            <div className="relative p-8 flex flex-col gap-5 overflow-hidden reveal" style={{ background: 'var(--dark3)' }}>
              {/* Background watermark */}
              <div
                className="absolute right-4 top-4 font-display font-semibold leading-none select-none pointer-events-none"
                style={{ fontSize: '120px', color: primary, opacity: 0.04, lineHeight: 1 }}
              >
                01
              </div>

              {/* Phase badge */}
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[9px] tracking-widest uppercase px-2 py-1"
                  style={{ background: `color-mix(in srgb, ${primary} 12%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}
                >
                  PRE-MATCH
                </span>
                <span className="font-display font-semibold theme-transition" style={{ fontSize: '28px', color: primary }}>
                  -1h 05m
                </span>
              </div>

              <div>
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-display font-semibold mb-2" style={{ fontSize: '24px', letterSpacing: '0.5px' }}>
                  Predict the Starting XI
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Study the squad and pick who you think starts. Set your formation, name your captain, then predict match stats.
                </p>
              </div>

              <ul className="flex flex-col gap-2">
                {['11 starting players', 'Formation & shape', 'Captain pick', 'Score, corners, BTTS'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 theme-transition" style={{ background: primary }} />
                    {item}
                  </li>
                ))}
              </ul>

              <div
                className="flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase mt-auto w-fit"
                style={{ background: `color-mix(in srgb, ${primary} 10%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}
              >
                🔒 Locks before kickoff
              </div>
            </div>

            {/* HALF-TIME */}
            <div className="relative p-8 flex flex-col gap-5 overflow-hidden reveal" style={{ background: 'var(--dark3)' }}>
              <div
                className="absolute right-4 top-4 font-display font-semibold leading-none select-none pointer-events-none"
                style={{ fontSize: '120px', color: 'var(--gold)', opacity: 0.04, lineHeight: 1 }}
              >
                02
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[9px] tracking-widest uppercase px-2 py-1"
                  style={{ background: 'rgba(255,210,63,0.10)', color: 'var(--gold)', border: '1px solid rgba(255,210,63,0.25)' }}
                >
                  HALF-TIME
                </span>
                <span className="font-display font-semibold" style={{ fontSize: '28px', color: 'var(--gold)' }}>
                  45&apos;
                </span>
              </div>

              <div>
                <div className="text-3xl mb-3">⏱️</div>
                <h3 className="font-display font-semibold mb-2" style={{ fontSize: '24px', letterSpacing: '0.5px' }}>
                  Adjust Your Haki
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  You saw the first half. Now predict how the manager reacts — substitutions, shape shifts and second-half approach.
                </p>
              </div>

              <ul className="flex flex-col gap-2">
                {['1st, 2nd & 3rd sub (in & out)', 'Formation change?', 'Second half mentality', 'Next goalscorer'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
                    {item}
                  </li>
                ))}
              </ul>

              <div
                className="flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase mt-auto w-fit"
                style={{ background: 'rgba(255,210,63,0.08)', color: 'var(--gold)', border: '1px solid rgba(255,210,63,0.22)' }}
              >
                🔒 Locks at 60&apos;
              </div>
            </div>

            {/* FULL-TIME */}
            <div className="relative p-8 flex flex-col gap-5 overflow-hidden reveal" style={{ background: 'var(--dark3)' }}>
              <div
                className="absolute right-4 top-4 font-display font-semibold leading-none select-none pointer-events-none"
                style={{ fontSize: '120px', color: 'var(--blue)', opacity: 0.04, lineHeight: 1 }}
              >
                03
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[9px] tracking-widest uppercase px-2 py-1"
                  style={{ background: 'rgba(0,209,255,0.10)', color: 'var(--blue)', border: '1px solid rgba(0,209,255,0.25)' }}
                >
                  FULL-TIME
                </span>
                <span className="font-display font-semibold" style={{ fontSize: '28px', color: 'var(--blue)' }}>
                  90&apos;+
                </span>
              </div>

              <div>
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-display font-semibold mb-2" style={{ fontSize: '24px', letterSpacing: '0.5px' }}>
                  AI Scores Your IQ
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  The moment the official lineup drops, AI instantly compares your predictions and gives personalised feedback.
                </p>
              </div>

              <ul className="flex flex-col gap-2">
                {['Starting XI accuracy %', 'Tactical read score', 'Sub prediction rating', 'Football IQ points awarded'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--blue)' }} />
                    {item}
                  </li>
                ))}
              </ul>

              <div
                className="flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase mt-auto w-fit"
                style={{ background: 'rgba(0,209,255,0.08)', color: 'var(--blue)', border: '1px solid rgba(0,209,255,0.22)' }}
              >
                🏆 Results &amp; leaderboard live
              </div>
            </div>

          </div>

          {/* Bottom AI feedback preview */}
          <div
            className="mt-px p-6 flex flex-col sm:flex-row items-center gap-4 border-t reveal"
            style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
          >
            <div className="text-2xl flex-shrink-0">🤖</div>
            <div className="flex-1">
              <p className="font-sans font-semibold text-[14px] mb-1" style={{ color: 'var(--text)' }}>
                Example AI feedback after the lineup drops:
              </p>
              <p className="font-mono text-[12px]" style={{ color: 'var(--muted)' }}>
                <span style={{ color: primary }}>&quot;You got 9/11 starters correct — better than 81% of scouts worldwide.
                You predicted 4-3-3, they played 4-2-3-1. Your captain Messi scored — double points activated!&quot;</span>
              </p>
            </div>
            <div
              className="flex-shrink-0 px-4 py-2 font-mono text-[10px] tracking-widest uppercase"
              style={{ background: `color-mix(in srgb, ${primary} 10%, transparent)`, color: primary, border: `1px solid color-mix(in srgb, ${primary} 25%, transparent)` }}
            >
              +42 IQ pts
            </div>
          </div>

        </div>
      </section>

      {/* ── PITCH BUILDER (main interactive section) ── */}
      <section id="builder" className="py-24" style={{ background: 'rgba(5, 13, 8, 0.6)' }}>
        <div className="max-w-[1400px] mx-auto px-7">
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


      {/* ── LEAGUES ── */}
      <section id="leagues" className="py-24" style={{ background: 'rgba(5, 13, 8, 0.75)' }}>
        <div className="max-w-[1400px] mx-auto px-7">
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

      {/* ── FOOTER ── */}
      <footer className="pt-14 pb-9 border-t" style={{ background: 'rgba(5, 13, 8, 0.85)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-7">
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
