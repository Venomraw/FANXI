'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[FanXI] Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--dark)' }}>
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border"
          style={{
            borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)',
            background: 'color-mix(in srgb, var(--red) 6%, transparent)',
          }}
        >
          <span className="text-2xl">⚠</span>
        </div>
        <h1 className="font-display font-semibold text-[24px] mb-3" style={{ color: 'var(--text)' }}>
          Something went wrong
        </h1>
        <p className="font-sans text-[15px] mb-8" style={{ color: 'var(--muted)' }}>
          An unexpected error occurred. This has been logged.
        </p>
        <button
          onClick={reset}
          className="inline-block font-sans font-semibold text-[14px] px-8 py-3.5 border transition-all"
          style={{
            color: 'var(--team-primary)',
            borderColor: 'color-mix(in srgb, var(--team-primary) 40%, transparent)',
            background: 'color-mix(in srgb, var(--team-primary) 8%, transparent)',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
