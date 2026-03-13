import CountdownBar from '@/src/components/landing/CountdownBar';
import ChampionsTimeline from '@/src/components/landing/ChampionsTimeline';
import TodayInHistory from '@/src/components/landing/TodayInHistory';
import NewsStrip from '@/src/components/landing/NewsStrip';
import UrgencyCountdown from '@/src/components/landing/UrgencyCountdown';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      {/* Countdown bar — fixed top, pushes content down */}
      <CountdownBar />

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center"
        style={{ paddingTop: '40px' }}
      >
        {/* Background overlay — layered over the global stadium-bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.50) 50%, rgba(0,0,0,0.20) 100%)',
            zIndex: 0,
          }}
        />

        <div
          className="relative max-w-7xl mx-auto px-7 pt-20 pb-20 w-full"
          style={{ zIndex: 1 }}
        >
          {/* Top label */}
          <span
            className="font-display font-semibold text-red-600 uppercase tracking-widest"
            style={{ fontSize: '13px' }}
          >
            THE ROAD TO WORLD CUP 2026
          </span>

          {/* Main headline */}
          <h1 className="font-sans font-bold mt-4 leading-none">
            <span
              className="block text-white"
              style={{ fontSize: 'clamp(52px, 9vw, 96px)' }}
            >
              THE WORLD CUP
            </span>
            <span
              className="block"
              style={{ fontSize: 'clamp(52px, 9vw, 96px)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>1930</span>
              <span className="text-white"> → </span>
              <span className="text-red-600">2026</span>
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="font-display text-white/60 mt-6 max-w-lg"
            style={{ fontSize: '18px', lineHeight: 1.7 }}
          >
            The greatest tournament in football history.
            <br />
            48 nations. 104 matches. One champion.
            <br />
            Predict every lineup. Prove your tactical IQ.
          </p>

          {/* CTA row */}
          <div className="mt-8 flex gap-4 flex-wrap">
            <Link
              href="/predict"
              className="font-display font-semibold text-white rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: '#dc2626',
                padding: '16px 32px',
                fontSize: '18px',
                display: 'inline-block',
              }}
            >
              ⚽ Start Predicting
            </Link>
            <Link
              href="/matches"
              className="font-display text-white rounded-lg transition-all duration-200 hover:border-white"
              style={{
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '16px 32px',
                fontSize: '18px',
                display: 'inline-block',
              }}
            >
              Explore Fixtures →
            </Link>
          </div>

          {/* Stat strip */}
          <div
            className="mt-16 inline-flex flex-wrap gap-0 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '16px 32px',
            }}
          >
            {[
              { icon: '🏆', label: '21 Tournaments' },
              { icon: '⚽', label: '48 Nations' },
              { icon: '🏟️', label: '104 Matches' },
              { icon: '🧠', label: '2,400 Scouts Competing' },
            ].map((stat, i, arr) => (
              <div key={stat.label} className="flex items-center">
                <span
                  className="font-display text-white/70"
                  style={{ fontSize: '14px', whiteSpace: 'nowrap' }}
                >
                  {stat.icon} {stat.label}
                </span>
                {i < arr.length - 1 && (
                  <span
                    className="mx-4 text-white/20"
                    style={{ fontSize: '16px' }}
                  >
                    |
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHAMPIONS TIMELINE ──────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <p
              className="font-mono text-red-500 uppercase"
              style={{ fontSize: '13px', letterSpacing: '1.5px' }}
            >
              // WORLD CUP CHAMPIONS
            </p>
            <h2
              className="font-sans text-white mt-2"
              style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}
            >
              Every champion since 1930
            </h2>
          </div>
          <ChampionsTimeline />
        </div>
      </section>

      {/* ─── TODAY IN HISTORY ────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#09090b' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-8">
            <p
              className="font-mono text-red-500 uppercase"
              style={{ fontSize: '13px', letterSpacing: '1.5px' }}
            >
              // TODAY IN WORLD CUP HISTORY
            </p>
          </div>
          <TodayInHistory />
        </div>
      </section>

      {/* ─── NEWS STRIP ──────────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <p
              className="font-mono text-red-500 uppercase"
              style={{ fontSize: '13px', letterSpacing: '1.5px' }}
            >
              // WC2026 INTELLIGENCE FEED
            </p>
            <h2
              className="font-sans text-white mt-2"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
            >
              World Cup Intel
            </h2>
          </div>
          <NewsStrip />
        </div>
      </section>

      {/* ─── URGENCY CTA ─────────────────────────────────────────────────────── */}
      <section
        className="py-24 text-center"
        style={{ background: '#09090b' }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <p
            className="font-mono text-red-500 uppercase mb-4"
            style={{ fontSize: '13px', letterSpacing: '1.5px' }}
          >
            // THE CLOCK IS RUNNING
          </p>
          <UrgencyCountdown />
        </div>
      </section>
    </main>
  );
}
