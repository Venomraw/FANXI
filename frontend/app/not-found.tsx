'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--dark)' }}>
      <div className="text-center max-w-md">
        <p
          className="font-display font-semibold leading-none mb-4"
          style={{ fontSize: 'clamp(80px, 15vw, 140px)', color: 'var(--team-primary)', opacity: 0.15 }}
        >
          404
        </p>
        <h1 className="font-display font-semibold text-[28px] mb-3" style={{ color: 'var(--text)' }}>
          Page not found
        </h1>
        <p className="font-sans text-[15px] mb-8" style={{ color: 'var(--muted)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block font-sans font-semibold text-[14px] px-8 py-3.5 border transition-all"
          style={{
            color: 'var(--team-primary)',
            borderColor: 'color-mix(in srgb, var(--team-primary) 40%, transparent)',
            background: 'color-mix(in srgb, var(--team-primary) 8%, transparent)',
          }}
        >
          Back to Hub
        </Link>
      </div>
    </div>
  );
}
