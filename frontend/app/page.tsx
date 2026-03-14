import CountdownBar from '@/src/components/landing/CountdownBar';
import LandingNav from '@/src/components/landing/LandingNav';
import IdentityStrip from '@/src/components/landing/IdentityStrip';
import ChampionsTimeline from '@/src/components/landing/ChampionsTimeline';
import TodayInHistory from '@/src/components/landing/TodayInHistory';
import NewsStrip from '@/src/components/landing/NewsStrip';
import UrgencyCountdown from '@/src/components/landing/UrgencyCountdown';
import RevealSection from '@/src/components/landing/RevealSection';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      {/* Stadium atmosphere — ultra-subtle light sweep (Pass 3) */}
      <div className="stadium-atmosphere" />

      {/* Countdown bar — fixed top, pushes content down */}
      <CountdownBar />

      {/* Navbar — transparent over hero, solid on scroll */}
      <LandingNav />

      {/* ─── IDENTITY STRIP ────────────────────────────────────────────────── */}
      {/* 40px countdown + 72px nav = 112px offset */}
      <div style={{ paddingTop: '112px' }}>
        <IdentityStrip />
      </div>

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col justify-center"
        style={{ minHeight: '75vh', marginTop: '-44px' }}
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
          className="relative max-w-7xl mx-auto px-7 pt-28 pb-20 w-full"
          style={{ zIndex: 1 }}
        >
          {/* Top label */}
          <span
            className="font-display font-semibold text-red-600 uppercase tracking-widest"
            style={{ fontSize: '13px' }}
          >
            FROM 1930 TO 2026. ONE TOURNAMENT.
          </span>

          {/* Main headline */}
          <h1 className="font-sans font-bold mt-3 leading-none">
            <span
              className="block"
              style={{ fontSize: 'clamp(52px, 9vw, 96px)', color: 'var(--landing-text)' }}
            >
              THE WORLD CUP
            </span>
            <span
              className="block"
              style={{ fontSize: 'clamp(52px, 9vw, 96px)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>1930</span>
              <span style={{ color: 'var(--landing-text)' }}> &rarr; </span>
              <span className="text-red-600">2026</span>
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="font-display mt-5 max-w-lg"
            style={{ fontSize: '18px', lineHeight: 1.7, color: 'var(--landing-muted)' }}
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
              className="predict-cta-glow font-display font-semibold text-white rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                background: '#dc2626',
                padding: '16px 32px',
                fontSize: '18px',
                display: 'inline-block',
              }}
            >
              Start Predicting
            </Link>
            <Link
              href="/matches"
              className="font-display rounded-lg transition-all duration-200 hover:border-white"
              style={{
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '16px 32px',
                fontSize: '18px',
                display: 'inline-block',
                color: 'var(--landing-text)',
              }}
            >
              Explore Fixtures &rarr;
            </Link>
          </div>

          {/* Stat strip */}
          <div
            className="mt-16 inline-flex flex-wrap gap-0 rounded-full glass-tier-2"
            style={{ padding: '16px 32px' }}
          >
            {[
              { icon: '\u{1F3C6}', label: '21 Tournaments' },
              { icon: '\u26BD', label: '48 Nations' },
              { icon: '\u{1F3DF}\uFE0F', label: '104 Matches' },
              { icon: '\u{1F9E0}', label: '2,400 Scouts Competing' },
            ].map((stat, i, arr) => (
              <div key={stat.label} className="flex items-center">
                <span
                  className="font-display"
                  style={{ fontSize: '14px', whiteSpace: 'nowrap', color: 'var(--landing-muted)' }}
                >
                  {stat.icon} {stat.label}
                </span>
                {i < arr.length - 1 && (
                  <span
                    className="mx-4"
                    style={{ fontSize: '16px', color: 'rgba(255,255,255,0.15)' }}
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
      <RevealSection>
        <ChampionsTimeline />
      </RevealSection>

      {/* ─── TODAY IN HISTORY ────────────────────────────────────────────────── */}
      <RevealSection>
        <section className="py-20" style={{ background: '#09090b' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-8">
              <p
                className="font-display font-semibold text-red-500 uppercase"
                style={{ fontSize: '13px', letterSpacing: '1.5px' }}
              >
                // TODAY IN WORLD CUP HISTORY
              </p>
            </div>
            <TodayInHistory />
          </div>
        </section>
      </RevealSection>

      {/* ─── NEWS STRIP ──────────────────────────────────────────────────────── */}
      <RevealSection>
        <section className="py-20" style={{ background: '#0a0a0a' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10">
              <p
                className="font-display font-semibold text-red-500 uppercase"
                style={{ fontSize: '13px', letterSpacing: '1.5px' }}
              >
                // WC2026 INTELLIGENCE FEED
              </p>
              <h2
                className="font-sans font-bold mt-2"
                style={{ fontSize: 'clamp(28px, 4vw, 48px)', color: 'var(--landing-text)' }}
              >
                World Cup Intel
              </h2>
            </div>
            <NewsStrip />
          </div>
        </section>
      </RevealSection>

      {/* ─── URGENCY CTA ─────────────────────────────────────────────────────── */}
      <RevealSection>
        <section
          className="py-24 text-center"
          style={{ background: '#09090b' }}
        >
          <div className="max-w-3xl mx-auto px-6">
            <p
              className="font-display font-semibold text-red-500 uppercase mb-4"
              style={{ fontSize: '13px', letterSpacing: '1.5px' }}
            >
              // THE CLOCK IS RUNNING
            </p>
            <UrgencyCountdown />
          </div>
        </section>
      </RevealSection>
    </main>
  );
}
