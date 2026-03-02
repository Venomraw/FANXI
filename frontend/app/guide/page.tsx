'use client';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';

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

const TIPS = [
  { icon: '🎯', title: 'Captain wisely', desc: 'Your captain earns double points — pick a player likely to score or assist, not just the biggest name.' },
  { icon: '🔒', title: 'Lock early', desc: 'Predictions lock at kickoff. A late lock costs −3 pts. Set your XI as soon as the lineup is confirmed.' },
  { icon: '📐', title: 'Formation matters', desc: 'A correct formation pick earns +5 pts. Study how the real manager sets up — not how you prefer to play.' },
  { icon: '🧠', title: 'BTTS is high value', desc: 'Both Teams to Score at +3 per correct pick is consistent money. Focus on attacking sides with leaky defences.' },
];

export default function GuidePage() {
  const router = useRouter();
  const { primary } = useTheme();
  const { user, logout } = useAuth();

  const borderSubtle = `color-mix(in srgb, ${primary} 12%, transparent)`;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--dark)', color: 'var(--text)' }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 w-full border-b theme-transition glass-panel" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-[1200px] mx-auto px-7 py-[18px] flex items-center justify-between gap-4">

          <h1
            className="font-display font-semibold text-[18px] tracking-[0.6px] leading-none theme-transition cursor-pointer"
            onClick={() => router.push('/')}
            style={{ color: primary }}
          >
            Fan<span style={{ color: 'var(--gold)' }}>XI</span>
            <span className="font-mono text-[11px] tracking-[1px] ml-2 align-middle" style={{ color: 'var(--muted)' }}>GUIDE</span>
          </h1>

          {/* Section anchors */}
          <ul className="hidden lg:flex items-center list-none">
            {[
              ['How to Play', '#how'],
              ['Scoring',     '#scoring'],
              ['Ranks',       '#ranks'],
              ['Tips',        '#tips'],
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="font-sans font-semibold text-[13px] px-4 py-2 border transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = primary; (e.currentTarget as HTMLButtonElement).style.color = primary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
            >
              ← Hub
            </button>

            {user && (
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
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative py-16 md:py-24 overflow-hidden border-b" style={{ borderColor: 'var(--border)', background: 'radial-gradient(ellipse 100% 60% at 50% 0%, #0d2010 0%, var(--dark) 70%)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${borderSubtle} 1px, transparent 1px), linear-gradient(90deg, ${borderSubtle} 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-4 theme-transition" style={{ color: primary }}>
            ⚡ FIFA World Cup 2026 · FanXI Platform
          </div>
          <h1
            className="font-display font-semibold leading-none mb-6"
            style={{ fontSize: 'clamp(64px, 11vw, 160px)', letterSpacing: '-1px', lineHeight: '0.88' }}
          >
            SCOUT<br />
            <span style={{ color: primary }}>MANUAL</span>
          </h1>
          <p className="text-[15px] leading-relaxed max-w-xl" style={{ color: 'var(--muted)' }}>
            Everything you need to know to build the perfect XI, outsmart the table, and climb from Scout to Legend before the final whistle.
          </p>
        </div>
      </section>

      {/* ── HOW TO PLAY ── */}
      <section id="how" className="py-12 md:py-16 border-b" style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: primary }}>// 01 — Process</div>
          <h2
            className="font-display font-semibold leading-none mb-14"
            style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            HOW TO PLAY
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_STEPS.map(step => (
              <div
                key={step.num}
                className="relative p-9 overflow-hidden group step-card"
                style={{ background: 'var(--dark)' }}
              >
                <div
                  className="absolute top-4 right-5 font-display font-semibold leading-none select-none"
                  style={{ fontSize: '76px', color: 'var(--border)' }}
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
      <section id="scoring" className="py-12 md:py-16 border-b" style={{ background: 'var(--dark)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: primary }}>// 02 — Point System</div>
          <h2
            className="font-display font-semibold leading-none mb-14"
            style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
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
        </div>
      </section>

      {/* ── RANKS ── */}
      <section id="ranks" className="py-12 md:py-16 border-b" style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: primary }}>// 03 — Progression</div>
          <h2
            className="font-display font-semibold leading-none mb-14"
            style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            RANK<br />SYSTEM
          </h2>

          <div className="flex flex-col gap-3">
            {RANKS.map((rank, i) => (
              <div
                key={rank.title}
                className="group relative flex items-center gap-6 p-7 border transition-all duration-300 overflow-hidden"
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
                <div className="text-4xl flex-shrink-0 pl-3">{rank.icon}</div>

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
                      className="font-mono text-[11px] tracking-widest uppercase"
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
                        width: rank.max === Infinity ? '100%' : `${Math.min(100, ((rank.max - rank.min) / 1000) * 100 + 20)}%`,
                        background: `linear-gradient(90deg, ${rank.color}88, ${rank.color})`,
                      }}
                    />
                  </div>
                  <div className="font-mono text-[9px] tracking-widest uppercase mt-2" style={{ color: rank.color, opacity: 0.6 }}>
                    {rank.max === Infinity ? 'Max Tier' : `${rank.max + 1 - rank.min} pt window`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIPS ── */}
      <section id="tips" className="py-12 md:py-16 border-b" style={{ background: 'var(--dark)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-3" style={{ color: primary }}>// 04 — Edge</div>
          <h2
            className="font-display font-semibold leading-none mb-14"
            style={{ fontSize: 'clamp(44px, 6vw, 86px)', letterSpacing: '1px', lineHeight: '0.95' }}
          >
            PRO TIPS
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TIPS.map(tip => (
              <div
                key={tip.title}
                className="p-8 border feature-card"
                style={{ background: 'var(--dark3)', borderColor: 'var(--border)' }}
              >
                <div className="text-3xl mb-4">{tip.icon}</div>
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
      <section className="py-16 md:py-20 text-center" style={{ background: 'var(--dark3)' }}>
        <div className="max-w-xl mx-auto px-6 md:px-10">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-4 theme-transition" style={{ color: primary }}>
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
            className="inline-flex items-center gap-2 px-10 py-4 font-mono text-[11px] font-bold tracking-widest uppercase transition-all hover:-translate-y-0.5 btn-cut-lg btn-shimmer"
            style={{
              background: primary, color: 'var(--dark)',
              boxShadow: `0 0 28px color-mix(in srgb, ${primary} 40%, transparent)`,
            }}
          >
            ⚽ Go to Hub
          </button>
        </div>
      </section>

    </div>
  );
}
