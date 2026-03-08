'use client';
import { useEffect } from 'react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/src/components/NavBar';
import PitchBoard from '@/src/components/pitch/PitchBoard';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function PredictPage() {
  const { user, isLoading } = useAuth();
  const { primary } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
    if (!isLoading && user && !user.onboarding_complete) router.push('/onboarding');
  }, [user, isLoading, router]);

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
    </div>
  );
}
