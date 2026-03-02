'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { primary, team } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(username, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      router.push('/');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('http://localhost:8000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, country_allegiance: country }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.detail ?? 'Registration failed');
      setLoading(false);
      return;
    }
    // Auto-login after register
    const err = await login(username, password);
    if (err) { setError(err); setLoading(false); }
    else router.push('/');
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic"
            style={{ color: primary }}>
            FanXI
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">
            World Cup 2026 Tactical Hub
          </p>
          {team && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900">
              <span>{team.flag}</span>
              <span className="text-zinc-400 text-xs">{team.name}</span>
            </div>
          )}
        </div>

        {/* Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl">

          {/* Mode toggle */}
          <div className="flex gap-2 p-1 bg-black/40 rounded-xl mb-6">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all"
                style={mode === m ? { backgroundColor: primary, color: '#000' } : { color: '#71717a' }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}
            className="flex flex-col gap-4">

            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                required placeholder="your_username"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                style={{ ['--tw-ring-color' as any]: primary }}
                onFocus={e => (e.target.style.borderColor = primary)}
                onBlur={e => (e.target.style.borderColor = '')}
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    required type="email" placeholder="you@example.com"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    onFocus={e => (e.target.style.borderColor = primary)}
                    onBlur={e => (e.target.style.borderColor = '')}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Country</label>
                  <input value={country} onChange={e => setCountry(e.target.value)}
                    required placeholder="e.g. Brazil"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    onFocus={e => (e.target.style.borderColor = primary)}
                    onBlur={e => (e.target.style.borderColor = '')}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500 mb-1 block">Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                required type="password" placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                onFocus={e => (e.target.style.borderColor = primary)}
                onBlur={e => (e.target.style.borderColor = '')}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center bg-red-900/20 border border-red-900/40 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 font-black uppercase rounded-xl transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: primary, color: '#000' }}>
              {loading ? '...' : mode === 'login' ? 'Enter the Hub' : 'Join the Hunt'}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-700 text-[10px] uppercase tracking-widest mt-6">
          Matchday Haki Connection: Secured
        </p>
      </div>
    </div>
  );
}
