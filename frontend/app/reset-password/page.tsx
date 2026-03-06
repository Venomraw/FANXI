'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { primary } = useTheme();

  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const borderPrimary = `color-mix(in srgb, ${primary} 18%, transparent)`;

  // Redirect to login after a short delay on success
  useEffect(() => {
    if (success) {
      const id = setTimeout(() => router.push('/login'), 3000);
      return () => clearTimeout(id);
    }
  }, [success, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? 'Something went wrong.');
      } else {
        setSuccess(true);
      }
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
            Choose a strong new password for your FanXI account. Once saved, your old password will no longer work.
          </p>
        </div>
        <div className="px-14 pb-10">
          <p className="font-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase' }}>
            Matchday Haki Connection · Secured
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative z-10">
        <div className="w-full max-w-sm fade-up-2">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="font-display leading-none theme-transition" style={{ fontSize: '5rem', color: primary }}>
              Fan<span style={{ color: 'var(--gold)' }}>XI</span>
            </h1>
          </div>

          {/* No token in URL */}
          {!token ? (
            <div className="text-center">
              <div className="mb-6" style={{ fontSize: '3rem' }}>🔗</div>
              <h2 className="font-display mb-4" style={{ fontSize: '2rem', color: 'var(--text)' }}>
                Invalid Link
              </h2>
              <p className="font-mono mb-8" style={{ fontSize: '13px', color: 'var(--muted)' }}>
                This reset link is missing a token. Please request a new one.
              </p>
              <button type="button" onClick={() => router.push('/forgot-password')}
                className="font-mono transition-colors"
                style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: primary, background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                Request New Link →
              </button>
            </div>
          ) : success ? (
            /* Success state */
            <div className="text-center">
              <div className="mb-6" style={{ fontSize: '3rem' }}>✅</div>
              <p className="font-mono mb-2" style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: primary }}>
                Password Updated
              </p>
              <h2 className="font-display mb-4" style={{ fontSize: '2rem', color: 'var(--text)' }}>
                All Done!
              </h2>
              <p className="font-mono" style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.8 }}>
                Your password has been updated. Redirecting you to login…
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8">
                <p className="font-mono mb-2" style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: primary }}>
                  Account Recovery
                </p>
                <h2 className="font-display" style={{ fontSize: '2rem', color: 'var(--text)' }}>
                  New Password
                </h2>
                <p className="font-mono mt-2" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Minimum 8 characters.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <label className="block mb-2 theme-transition"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: primary }}>
                    New Password
                  </label>
                  <input
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    type="password"
                    placeholder="••••••••"
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

                <div>
                  <label className="block mb-2 theme-transition"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: primary }}>
                    Confirm Password
                  </label>
                  <input
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    type="password"
                    placeholder="••••••••"
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
                    {(error.includes('expired') || error.includes('used') || error.includes('Invalid')) && (
                      <button type="button" onClick={() => router.push('/forgot-password')}
                        className="font-mono mt-2 transition-colors"
                        style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Request a new link →
                      </button>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-4 font-display transition-all active:scale-95 disabled:opacity-40 btn-cut-lg btn-shimmer theme-transition mt-2"
                  style={{
                    fontSize: '20px', letterSpacing: '3px', textTransform: 'uppercase',
                    background: primary, color: '#000',
                    boxShadow: `0 0 28px color-mix(in srgb, ${primary} 50%, transparent)`,
                  }}>
                  {loading ? '...' : 'Set New Password'}
                </button>
              </form>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ background: '#060A06', minHeight: '100vh' }} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
