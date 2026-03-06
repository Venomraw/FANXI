'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { primary } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const borderPrimary = `color-mix(in srgb, ${primary} 18%, transparent)`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success to avoid leaking account existence
      setSent(true);
    } catch {
      setError('Connection error — is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--dark)', color: 'var(--text)' }}>
      <div className="grid-bg-primary opacity-100" />

      {/* Background orbs */}
      <div className="absolute pointer-events-none"
        style={{
          right: '-80px', top: '15%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(255,210,63,0.05), transparent 70%)',
          borderRadius: '50%', animation: 'orbPulse 8s ease-in-out infinite',
        }} />
      <div className="absolute pointer-events-none theme-transition"
        style={{
          left: '20%', bottom: '10%', width: '400px', height: '400px',
          background: `radial-gradient(circle, color-mix(in srgb, ${primary} 6%, transparent), transparent 70%)`,
          borderRadius: '50%', animation: 'orbPulse 11s ease-in-out infinite reverse',
        }} />

      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 relative border-r overflow-hidden"
        style={{ borderColor: `color-mix(in srgb, ${primary} 10%, transparent)` }}>
        <div className="px-14 pt-14 pb-8 fade-up-1">
          <h1 className="font-display leading-none theme-transition"
            style={{ fontSize: 'clamp(80px, 12vw, 160px)', color: primary, letterSpacing: '-1px' }}>
            Fan<span style={{ color: 'var(--gold)' }}>XI</span>
          </h1>
          <p className="font-mono mt-3"
            style={{ fontSize: '11px', letterSpacing: '3px', color: 'var(--muted)', textTransform: 'uppercase' }}>
            World Cup 2026 · Tactical Hub
          </p>
        </div>
        <div className="px-14 flex-1 flex flex-col justify-center">
          <p className="font-mono" style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.8 }}>
            Enter your registered email address and we&apos;ll send you a secure reset link. The link expires in 1 hour.
          </p>
        </div>
        <div className="px-14 pb-10">
          <p className="font-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase' }}>
            Matchday Haki Connection · Secured
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative z-10">
        <div className="w-full max-w-sm fade-up-2">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="font-display leading-none theme-transition" style={{ fontSize: '5rem', color: primary }}>
              Fan<span style={{ color: 'var(--gold)' }}>XI</span>
            </h1>
          </div>

          {!sent ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <p className="font-mono mb-2" style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: primary }}>
                  Account Recovery
                </p>
                <h2 className="font-display" style={{ fontSize: '2rem', color: 'var(--text)' }}>
                  Forgot Password
                </h2>
                <p className="font-mono mt-2" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  We&apos;ll send a reset link to your inbox.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block mb-2 theme-transition"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: primary }}>
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    type="email"
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 font-mono text-sm outline-none transition-colors theme-transition"
                    style={{
                      background: 'var(--dark3)', color: 'var(--text)',
                      border: `1px solid ${borderPrimary}`,
                      fontSize: '13px',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = primary;
                      e.target.style.boxShadow = `0 0 14px color-mix(in srgb, ${primary} 20%, transparent)`;
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = borderPrimary;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {error && (
                  <div className="px-4 py-3" style={{ border: '1px solid rgba(255,45,85,0.4)', background: 'rgba(255,45,85,0.06)' }}>
                    <p className="font-mono text-xs" style={{ color: 'var(--red)' }}>{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-4 font-display transition-all active:scale-95 disabled:opacity-40 btn-cut-lg btn-shimmer theme-transition mt-2"
                  style={{
                    fontSize: '20px', letterSpacing: '3px', textTransform: 'uppercase',
                    background: primary, color: '#000',
                    boxShadow: `0 0 28px color-mix(in srgb, ${primary} 50%, transparent)`,
                  }}>
                  {loading ? '...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            /* Success state */
            <div className="text-center">
              <div className="mb-6" style={{ fontSize: '3rem' }}>📬</div>
              <p className="font-mono mb-2" style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: primary }}>
                Email Sent
              </p>
              <h2 className="font-display mb-4" style={{ fontSize: '2rem', color: 'var(--text)' }}>
                Check Your Inbox
              </h2>
              <p className="font-mono" style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.8 }}>
                If that email is registered, a reset link has been sent. Check your inbox (and spam folder). The link expires in 1 hour.
              </p>
            </div>
          )}

          {/* Back to login */}
          <div className="text-center mt-10">
            <button type="button" onClick={() => router.push('/login')}
              className="font-mono transition-colors"
              style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = primary)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
