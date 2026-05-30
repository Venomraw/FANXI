'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[FanXI] App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--dark)' }}>
      <div className="text-center max-w-md">
        <div
          className="w-14 h-14 mx-auto mb-6 flex items-center justify-center border"
          style={{
            borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)',
            background: 'color-mix(in srgb, var(--red) 6%, transparent)',
          }}
        >
          <span className="text-xl">⚠</span>
        </div>
        <h1 className="font-display font-semibold text-[22px] mb-2" style={{ color: 'var(--text)' }}>
          Something went wrong
        </h1>
        <p className="font-sans text-[14px] mb-8" style={{ color: 'var(--muted)' }}>
          An error occurred while loading this page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="font-sans font-semibold text-[13px] px-6 py-3 border transition-all"
            style={{
              color: 'var(--team-primary)',
              borderColor: 'color-mix(in srgb, var(--team-primary) 40%, transparent)',
              background: 'color-mix(in srgb, var(--team-primary) 8%, transparent)',
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="font-sans font-semibold text-[13px] px-6 py-3 border transition-all"
            style={{
              color: 'var(--muted)',
              borderColor: 'var(--border)',
              background: 'transparent',
            }}
          >
            Back to Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
