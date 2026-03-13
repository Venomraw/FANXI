import CountdownBar from '@/src/components/landing/CountdownBar';
import ChampionsTimeline from '@/src/components/landing/ChampionsTimeline';
import TodayInHistory from '@/src/components/landing/TodayInHistory';
import NewsStrip from '@/src/components/landing/NewsStrip';
import Link from 'next/link';

// Days from 2026-03-13 to 2026-06-11
const DAYS_TO_WC = 455;

export default function HomePage() {
  return (
    <main>
      {/* Countdown bar — fixed top, pushes content down */}
      <CountdownBar />

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center"
        style={{ paddingTop: '40px' }} /* account for CountdownBar height */
      >
        {/* Background overlay — layered over the global stadium-bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.25) 100%)',
            zIndex: 0,
          }}
        />

        <div
          className="relative max-w-7xl mx-auto px-6 pt-20 pb-20 w-full"
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
              href="/login"
              className="font-display font-semibold text-white rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: '#dc2626',
                padding: '16px 32px',
                fontSize: '18px',
                display: 'inline-block',
              }}
              onMouseEnter={undefined}
            >
              Start Predicting
            </Link>
            <Link
              href="/predict"
              className="font-display text-white rounded-lg transition-all duration-200 hover:border-white"
              style={{
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '16px 32px',
                fontSize: '18px',
                display: 'inline-block',
              }}
            >
              Browse Matches
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
          <h2
            className="font-sans text-white font-bold mb-6"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            World Cup 2026 starts in
            <br />
            <span className="text-red-600">{DAYS_TO_WC} days.</span>
          </h2>
          <p
            className="font-display text-white/60 mb-10"
            style={{ fontSize: '18px', lineHeight: 1.7 }}
          >
            Make your first prediction now.
            <br />
            Pick your lineups. Beat your rivals.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 font-display font-semibold text-white rounded-xl transition-all duration-200 hover:scale-105"
            style={{
              background: '#dc2626',
              padding: '20px 40px',
              fontSize: '20px',
              boxShadow: '0 8px 32px rgba(220,38,38,0.3)',
            }}
          >
            ⚽ Join Free — It Takes 2 Minutes
          </Link>
        </div>
      </section>
    </main>
  );
}
