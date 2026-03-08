'use client';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/src/components/NavBar';
import PitchBoard from '@/src/components/pitch/PitchBoard';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

// ── Tutorial steps ───────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    icon: '👆',
    title: 'Drag players to the pitch',
    body: 'Find your players in the squad list below the pitch. Drag them up into the empty slots — or tap a slot then tap a player name.',
    hint: 'Start with your goalkeeper, then build outward.',
    color: '#00FF85',
  },
  {
    icon: '📐',
    title: 'Set your formation',
    body: 'Use the formation selector to shape how your team lines up. The pitch will reorganise the slots to match your chosen shape.',
    hint: 'Pick the formation you think the manager will actually use.',
    color: '#00D1FF',
  },
  {
    icon: '🔒',
    title: 'Lock before kickoff',
    body: 'Once you\'re happy with your XI, hit the Predict button to lock it in. You cannot change your prediction after kickoff.',
    hint: 'Predictions lock automatically 1 hour before kickoff.',
    color: '#FFD23F',
  },
];

const STORAGE_KEY = 'fanxi_predict_tutorial_seen';

// ── Tutorial Overlay ─────────────────────────────────────────────────────────

function TutorialOverlay({ primary, onDone }: { primary: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, 'true');
      onDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onDone();
  };

  return (
    <>
      <style>{`
        @keyframes tutorialIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200]"
        style={{ background: 'rgba(6,10,6,0.78)', backdropFilter: 'blur(4px)' }}
        onClick={handleSkip}
      />

      {/* Modal card */}
      <div
        className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full"
        style={{ maxWidth: '440px', padding: '0 16px' }}
      >
        <div
          className="flex flex-col gap-5 p-8"
          style={{
            background: 'rgba(6,10,6,0.96)',
            border: `1px solid color-mix(in srgb, ${current.color} 30%, rgba(255,255,255,0.08))`,
            backdropFilter: 'blur(24px)',
            boxShadow: `0 0 60px rgba(0,0,0,0.7), 0 0 30px color-mix(in srgb, ${current.color} 12%, transparent)`,
            animation: 'tutorialIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Step dots */}
          <div className="flex items-center gap-2">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className="transition-all duration-300"
                style={{
                  height: '3px',
                  flex: i === step ? '2' : '1',
                  background: i === step ? current.color : 'rgba(255,255,255,0.12)',
                  borderRadius: '2px',
                }}
              />
            ))}
          </div>

          {/* Icon */}
          <div
            className="w-14 h-14 flex items-center justify-center text-3xl flex-shrink-0"
            style={{
              background: `color-mix(in srgb, ${current.color} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${current.color} 25%, transparent)`,
              boxShadow: `0 0 20px color-mix(in srgb, ${current.color} 15%, transparent)`,
            }}
          >
            {current.icon}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">
            <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: current.color }}>
              Step {step + 1} of {TUTORIAL_STEPS.length}
            </div>
            <h3 className="font-display font-semibold leading-tight" style={{ fontSize: '22px' }}>
              {current.title}
            </h3>
            <p className="font-sans text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {current.body}
            </p>
          </div>

          {/* Hint */}
          <div
            className="px-4 py-2.5"
            style={{
              background: `color-mix(in srgb, ${current.color} 6%, transparent)`,
              border: `1px solid color-mix(in srgb, ${current.color} 15%, transparent)`,
            }}
          >
            <p className="font-mono text-[11px]" style={{ color: `color-mix(in srgb, ${current.color} 80%, rgba(255,255,255,0.6))` }}>
              💡 {current.hint}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleNext}
              className="flex-1 py-3 font-display font-semibold text-[14px] uppercase tracking-widest transition-all hover:-translate-y-0.5"
              style={{
                background: current.color,
                color: '#060A06',
                boxShadow: `0 0 20px color-mix(in srgb, ${current.color} 30%, transparent)`,
              }}
            >
              {isLast ? 'Got it!' : 'Next →'}
            </button>
            {!isLast && (
              <button
                onClick={handleSkip}
                className="font-mono text-[10px] uppercase tracking-widest px-4 py-3 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PredictPage() {
  const { user, isLoading } = useAuth();
  const { primary } = useTheme();
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
    if (!isLoading && user && !user.onboarding_complete) router.push('/onboarding');
  }, [user, isLoading, router]);

  // Show tutorial on first visit
  useEffect(() => {
    if (user && !localStorage.getItem(STORAGE_KEY)) {
      setShowTutorial(true);
    }
  }, [user]);

  if (isLoading || !user) return null;

  return (
    <div className="flex min-h-screen flex-col font-sans" style={{ background: 'transparent', color: 'var(--text)' }}>
      <NavBar subtitle="PREDICT" />

      {/* Page header */}
      <div style={{ background: 'rgba(0,0,0,0.45)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1400px] mx-auto px-7 py-8">
          <div className="font-mono text-[11px] tracking-widest uppercase mb-2 theme-transition" style={{ color: primary }}>
            // Tactical Lab
          </div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <h1
              className="font-display font-semibold leading-none"
              style={{ fontSize: 'clamp(40px, 6vw, 72px)', letterSpacing: '1px', lineHeight: '0.92' }}
            >
              BUILD YOUR <span style={{ color: primary }}>XI</span>
            </h1>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                Select a match below to begin
              </span>
              <button
                onClick={() => router.push('/matches')}
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all"
                style={{
                  color: primary,
                  border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)`,
                  background: `color-mix(in srgb, ${primary} 8%, transparent)`,
                }}
              >
                View All Fixtures
              </button>
              {/* Help button — re-triggers tutorial */}
              <button
                onClick={() => setShowTutorial(true)}
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 border transition-all"
                title="How to use the pitch"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--muted)',
                  background: 'rgba(0,0,0,0.3)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = primary; (e.currentTarget as HTMLButtonElement).style.borderColor = `color-mix(in srgb, ${primary} 35%, transparent)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
              >
                ? Help
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PitchBoard */}
      <main className="flex-1 py-8">
        <div className="max-w-[1400px] mx-auto px-7">
          <Suspense fallback={
            <div className="flex items-center justify-center py-24">
              <span className="font-mono text-[11px] tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
                Loading Tactical Engine...
              </span>
            </div>
          }>
            <PitchBoard />
          </Suspense>
        </div>
      </main>

      {/* Tutorial overlay */}
      {showTutorial && (
        <TutorialOverlay
          primary={primary}
          onDone={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
}
