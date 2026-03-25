'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import NavBar from '@/src/components/NavBar';

const NAV_SECTIONS = [
  { id: 'how',     label: 'How to Play', num: '01' },
  { id: 'scoring', label: 'Scoring',     num: '02' },
  { id: 'ranks',   label: 'Ranks',       num: '03' },
  { id: 'tips',    label: 'Pro Tips',    num: '04' },
];

const HOW_STEPS = [
  {
    num: '01', icon: '🔐',
    title: 'Sign Up Free',
    desc: 'Create your Scout account in seconds. No credit card required. Pick a username and start predicting.',
  },
  {
    num: '02', icon: '🧠',
    title: 'Pick Your XI',
    desc: 'Build your tactical lineup with real WC2026 players. 48 nations, 1100+ players. Formation is everything.',
  },
  {
    num: '03', icon: '⚡',
    title: 'Set Tactical Haki',
    desc: 'Set formation, pressing intensity, mentality. Prove your Football IQ before each match kicks off.',
  },
  {
    num: '04', icon: '📡',
    title: 'Score Live',
    desc: 'Watch Football IQ update in real-time as matches unfold. Climb the leaderboard. Become a Legend.',
  },
];

const SCORING_POS = [
  { label: 'Correct Result (1X2)',       pts: '+5'  },
  { label: 'Correct Score (Exact)',       pts: '+10' },
  { label: 'BTTS Correct',               pts: '+3'  },
  { label: 'Over/Under Correct',          pts: '+3'  },
  { label: 'First Goalscorer Correct',    pts: '+8'  },
  { label: 'Correct Formation Pick',      pts: '+5'  },
  { label: 'Tactical Accuracy Bonus',     pts: '+3'  },
  { label: 'Football IQ Rank Bonus',      pts: '+2'  },
  { label: 'Captain Multiplier',          pts: '×2'  },
];

const SCORING_NEG = [
  { label: 'Yellow Card Player',          pts: '-1'  },
  { label: 'Red Card Player',             pts: '-3'  },
  { label: 'Penalty Missed',              pts: '-2'  },
  { label: 'Own Goal Player',             pts: '-2'  },
  { label: 'Late Lock Penalty',           pts: '-3'  },
  { label: 'Extra Transfer (beyond 1)',   pts: '-4'  },
];

const SCORING_BONUS = [
  { label: 'Man of the Match',            pts: '+3'  },
  { label: 'Hat Trick Bonus',             pts: '+3'  },
  { label: 'Tournament Advancement',      pts: '+2'  },
];

const RANKS = [
  {
    title: 'Scout',
    range: '0 — 99 pts',
    min: 0, max: 99,
    color: '#9CA3AF',
    icon: '🔭',
    desc: 'You just arrived. Every prediction counts. Build your IQ and climb from here.',
  },
  {
    title: 'Analyst',
    range: '100 — 299 pts',
    min: 100, max: 299,
    color: '#34D399',
    icon: '📊',
    desc: 'You understand the game. Patterns are starting to click. The leaderboard notices you.',
  },
  {
    title: 'Tactician',
    range: '300 — 599 pts',
    min: 300, max: 599,
    color: '#60A5FA',
    icon: '🧩',
    desc: 'You read formations, anticipate goals, spot the right captain. Real football intelligence.',
  },
  {
    title: 'Commander',
    range: '600 — 999 pts',
    min: 600, max: 999,
    color: '#C084FC',
    icon: '⚔️',
    desc: 'Elite level. You predict what others miss. Your lineup consistently punches above its weight.',
  },
  {
    title: 'Legend',
    range: '1000+ pts',
    min: 1000, max: Infinity,
    color: '#FFD700',
    icon: '👑',
    desc: 'The pinnacle. Fewer than 1% reach this. Your name is permanent on the board.',
  },
];

const TIP_LINKS: Record<string, string> = {
  'Captain wisely':    '/',
  'Lock early':        '/',
  'Formation matters': '/',
  'BTTS is high value':'/',
};

const TIPS = [
  { icon: '🎯', title: 'Captain wisely', desc: 'Your captain earns double points — pick a player likely to score or assist, not just the biggest name.' },
  { icon: '🔒', title: 'Lock early', desc: 'Predictions lock at kickoff. A late lock costs −3 pts. Set your XI as soon as the lineup is confirmed.' },
  { icon: '📐', title: 'Formation matters', desc: 'A correct formation pick earns +5 pts. Study how the real manager sets up — not how you prefer to play.' },
  { icon: '🧠', title: 'BTTS is high value', desc: 'Both Teams to Score at +3 per correct pick is consistent money. Focus on attacking sides with leaky defences.' },
];

export default function GuidePage() {
  const router = useRouter();
  const { primary } = useTheme();

  const ranksRef = useRef<HTMLDivElement>(null);
  const [ranksVisible, setRanksVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('how');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRanksVisible(true); },
      { threshold: 0.2 }
    );
    if (ranksRef.current) observer.observe(ranksRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-20% 0px -70% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const borderSubtle = `color-mix(in srgb, ${primary} 12%, transparent)`;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--dark)', color: 'var(--text)' }}>

      <NavBar subtitle="GUIDE" />

      {/* ── STICKY SECTION NAV ── */}
      <div
        className="sticky z-40"
        style={{
          top: 0,
          minHeight: '48px',
          background: 'rgba(6,10,6,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          className="max-w-[1400px] mx-auto flex items-center gap-8 overflow-x-auto"
          style={{ paddingLeft: '32px', paddingRight: '32px', scrollbarWidth: 'none' }}
        >
          {NAV_SECTIONS.map(({ id, label, num }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="relative flex items-center gap-3 py-5 font-sans font-semibold tracking-wide whitespace-nowrap transition-colors duration-200 flex-shrink-0"
                style={{
                  fontSize: '12px',
                  color: active ? primary : 'var(--muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: active ? `2px solid ${primary}` : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                <span
                  className="font-mono"
                  style={{ fontSize: '13px', color: active ? primary : 'var(--muted)', transition: 'color 0.2s' }}
                >
                  {num}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="relative py-16 md:py-24 overflow-hidden border-b" style={{ borderColor: 'var(--border)', background: 'radial-gradient(ellipse 100% 60% at 50% 0%, #0d2010 0%, var(--dark) 70%)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${borderSubtle} 1px, transparent 1px), linear-gradient(90deg, ${borderSubtle} 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 max-w-[1400px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16 items-center">
          <div>
            <div className="font-mono text-xs tracking-widest uppercase mb-4 theme-transition" style={{ color: primary }}>
              ⚡ FIFA World Cup 2026 · FanXI Platform
            </div>
            <h1
              className="font-display font-semibold leading-none mb-6"
              style={{ fontSize: 'clamp(80px, 12vw, 160px)', letterSpacing: '-1px', lineHeight: '0.88' }}
            >
              SCOUT<br />
              <span style={{ color: primary }}>MANUAL</span>
            </h1>
            <p className="text-[15px] leading-relaxed max-w-xl mb-8" style={{ color: 'var(--muted)' }}>
              Everything you need to know to build the perfect XI, outsmart the table, and climb from Scout to Legend before the final whistle.
            </p>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-px border theme-transition"
            style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
            {[
              { num: '48',    label: 'Nations'  },
              { num: '104',   label: 'Matches'  },
              { num: '5',     label: 'Ranks'    },
              { num: '1100+', label: 'Players'  },
            ].map(s => (
              <div key={s.label} className="flex flex-col justify-center items-center py-10 theme-transition"
                style={{ background: 'var(--dark3)' }}>
                <div className="font-display font-semibold leading-none theme-transition"
                  style={{ fontSize: 'clamp(32px, 3vw, 48px)', color: primary }}>
                  {s.num}
                </div>
                <div className="font-mono text-xs tracking-widest uppercase mt-2"
                  style={{ color: 'var(--muted)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO PLAY ── */}
      <section id="how" className="py-24 md:py-32 border-b" style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: primary, paddingTop: '8px' }}>// 01 — Process</div>
          <h2
            className="font-display font-semibold leading-none mt-2 mb-20 md:mb-24"
            style={{ fontSize: 'clamp(56px, 7vw, 100px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            HOW TO PLAY
          </h2>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4" style={{ marginTop: '24px' }}>
            <div className="hidden lg:block absolute top-[52px] left-[25%] right-[25%] h-px pointer-events-none"
              style={{ background: `linear-gradient(90deg, transparent, ${primary}40, ${primary}40, transparent)` }} />
            {HOW_STEPS.map(step => (
              <div
                key={step.num}
                className="relative p-9 overflow-hidden group step-card"
                style={{ background: 'var(--dark)', border: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = primary}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
              >
                <div
                  className="absolute top-4 right-5 font-display font-semibold leading-none select-none"
                  style={{ fontSize: '76px', color: `color-mix(in srgb, ${primary} 10%, transparent)` }}
                >
                  {step.num}
                </div>
                <div className="text-3xl mb-5 relative">{step.icon}</div>
                <h3
                  className="font-display font-semibold mb-3 relative"
                  style={{ fontSize: '26px', letterSpacing: '1px' }}
                >
                  {step.title}
                </h3>
                <p className="text-[13px] leading-relaxed relative" style={{ color: 'var(--muted)' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORING ── */}
      <section id="scoring" className="py-24 md:py-32 border-b" style={{ background: 'var(--dark)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: primary, paddingTop: '8px' }}>// 02 — Point System</div>
          <h2
            className="font-display font-semibold leading-none mt-2 mb-20 md:mb-24"
            style={{ fontSize: 'clamp(56px, 7vw, 100px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            SCORING<br />BREAKDOWN
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Positive */}
            <div className="p-9" style={{ background: 'var(--dark3)' }}>
              <h3 className="font-display font-semibold mb-6" style={{ fontSize: '22px', letterSpacing: '1px', color: primary }}>
                ⬆ Positive Actions
              </h3>
              {SCORING_POS.map(row => (
                <div
                  key={row.label}
                  className="flex justify-between items-center py-3.5 border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-[13px]" style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span className="font-display font-semibold" style={{ fontSize: '22px', lineHeight: '1', color: primary }}>{row.pts}</span>
                </div>
              ))}
            </div>

            {/* Negative + Bonus stacked */}
            <div className="flex flex-col gap-6">
              <div className="p-9" style={{ background: 'var(--dark3)' }}>
                <h3 className="font-display font-semibold mb-6" style={{ fontSize: '22px', letterSpacing: '1px', color: 'var(--red)' }}>
                  ⬇ Deductions
                </h3>
                {SCORING_NEG.map(row => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-3.5 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-[13px]" style={{ color: 'var(--muted)' }}>{row.label}</span>
                    <span className="font-display font-semibold" style={{ fontSize: '22px', lineHeight: '1', color: 'var(--red)' }}>{row.pts}</span>
                  </div>
                ))}
              </div>

              <div className="p-9" style={{ background: 'var(--dark3)' }}>
                <h3 className="font-display font-semibold mb-6" style={{ fontSize: '22px', letterSpacing: '1px', color: 'var(--gold)' }}>
                  🏆 Bonus Points
                </h3>
                {SCORING_BONUS.map(row => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-3.5 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="text-[13px]" style={{ color: 'var(--muted)' }}>{row.label}</span>
                    <span className="font-display font-semibold" style={{ fontSize: '22px', lineHeight: '1', color: 'var(--gold)' }}>{row.pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 p-6 border flex items-center justify-between flex-wrap gap-4"
            style={{ background: 'var(--dark3)', borderColor: `color-mix(in srgb, ${primary} 25%, transparent)` }}>
            <div>
              <div className="font-mono text-xs tracking-widest uppercase mb-1"
                style={{ color: 'var(--muted)' }}>Maximum per match</div>
              <div className="font-display font-semibold"
                style={{ fontSize: '32px', color: primary }}>+42 pts</div>
            </div>
            <div className="font-mono text-xs leading-relaxed max-w-sm"
              style={{ color: 'var(--muted)' }}>
              Perfect prediction: correct result + exact score + BTTS + O/U +
              first goalscorer + formation + captain multiplier + all bonuses.
            </div>
          </div>
        </div>
      </section>

      {/* ── RANKS ── */}
      <section id="ranks" className="py-24 md:py-32 border-b" style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: primary, paddingTop: '8px' }}>// 03 — Progression</div>
          <h2
            className="font-display font-semibold leading-none mt-2 mb-20 md:mb-24"
            style={{ fontSize: 'clamp(56px, 7vw, 100px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            RANK<br />SYSTEM
          </h2>

          <div className="flex flex-col gap-4" ref={ranksRef}>
            {RANKS.map((rank, i) => (
              <div
                key={rank.title}
                className="group relative flex items-center gap-6 px-8 py-7 border transition-all duration-300 overflow-hidden"
                style={{ background: 'var(--dark)', borderColor: `${rank.color}20` }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = `${rank.color}60`)}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = `${rank.color}20`)}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: rank.color }}
                />

                {/* Rank number */}
                <div
                  className="absolute right-6 top-1/2 -translate-y-1/2 font-display font-semibold leading-none select-none opacity-10"
                  style={{ fontSize: '72px', color: rank.color }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>

                {/* Icon */}
                <div className="text-4xl flex-shrink-0 pl-6">{rank.icon}</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-4 flex-wrap mb-1">
                    <span
                      className="font-display font-semibold"
                      style={{ fontSize: '28px', color: rank.color, letterSpacing: '1px' }}
                    >
                      {rank.title}
                    </span>
                    <span
                      className="font-mono text-xs tracking-widest uppercase"
                      style={{ color: rank.color, opacity: 0.7 }}
                    >
                      {rank.range}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {rank.desc}
                  </p>
                </div>

                {/* Progress bar (visual only) */}
                <div className="hidden md:block w-32 flex-shrink-0">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: ranksVisible
                          ? (rank.max === Infinity ? '100%' : `${Math.min(100, ((rank.max - rank.min) / 1000) * 100 + 20)}%`)
                          : '0%',
                        background: `linear-gradient(90deg, ${rank.color}88, ${rank.color})`,
                        transition: 'width 1s ease 0.3s',
                      }}
                    />
                  </div>
                  <div className="font-mono text-xs tracking-widest uppercase mt-2" style={{ color: rank.color, opacity: 0.6 }}>
                    {rank.max === Infinity ? 'Max Tier' : `${rank.max + 1 - rank.min} pt window`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIPS ── */}
      <section id="tips" className="py-24 md:py-32 border-b" style={{ background: 'var(--dark)', borderColor: 'var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
          <div className="font-mono text-xs tracking-widest uppercase mb-4" style={{ color: primary, paddingTop: '8px' }}>// 04 — Edge</div>
          <h2
            className="font-display font-semibold leading-none mt-2 mb-20 md:mb-24"
            style={{ fontSize: 'clamp(56px, 7vw, 100px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            PRO TIPS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TIPS.map(tip => (
              <div
                key={tip.title}
                className="group p-10 border feature-card"
                style={{ background: 'var(--dark3)', borderColor: 'var(--border)', borderBottom: `3px solid color-mix(in srgb, ${primary} 0%, transparent)`, transition: 'border-bottom-color 0.3s ease' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderBottomColor = primary}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderBottomColor = `color-mix(in srgb, ${primary} 0%, transparent)`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-3xl">{tip.icon}</div>
                  <span className="font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: primary }}>→</span>
                </div>
                <h3
                  className="font-display font-semibold mb-3"
                  style={{ fontSize: '22px', letterSpacing: '1px' }}
                >
                  {tip.title}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {tip.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ── */}
      <section className="py-16 md:py-20 text-center" style={{ background: 'var(--dark3)', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div style={{
            width: '400px', height: '400px',
            background: `radial-gradient(circle, color-mix(in srgb, ${primary} 8%, transparent), transparent 70%)`,
            borderRadius: '50%',
          }} />
        </div>
        <div className="relative z-10 max-w-xl mx-auto px-8 lg:px-16">
          <div className="font-mono text-xs tracking-widest uppercase mb-4 theme-transition" style={{ color: primary }}>
            Ready to play?
          </div>
          <h2
            className="font-display font-semibold leading-none mb-6"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            BUILD YOUR<br />
            <span style={{ color: primary }}>XI NOW</span>
          </h2>
          <p className="text-[14px] leading-relaxed mb-10" style={{ color: 'var(--muted)' }}>
            Lock your lineup before kickoff. Every correct prediction earns Football IQ points.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-10 py-4 font-mono text-xs font-bold tracking-widest uppercase transition-all hover:-translate-y-0.5 btn-cut-lg btn-shimmer"
            style={{
              background: primary, color: 'var(--dark)',
              boxShadow: `0 0 28px color-mix(in srgb, ${primary} 40%, transparent)`,
            }}
          >
            ⚽ Go to Hub
          </button>
          <p className="font-mono text-xs tracking-widest uppercase mt-6"
            style={{ color: 'var(--muted)' }}>
            Free to play · No credit card · Locks at kickoff
          </p>
        </div>
      </section>

    </div>
  );
}
