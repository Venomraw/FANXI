'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PitchBoard from "@/src/components/pitch/PitchBoard";
import Countdown from "@/src/components/hub/Countdown";
import UserStats from "@/src/components/hub/UserStats";
import MiniLeaderboard from "@/src/components/hub/MiniLeaderboard";
import { useTheme } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/context/AuthContext";

const TICKER_ITEMS = [
  'World Cup 2026 · 48 Teams · 3 Nations',
  'MetLife Stadium · Jun 11 Kickoff',
  'Lock Your Predictions · Earn IQ Points',
  'Rise Through the Ranks · Become a Legend',
  'FanXI Tactical Hub · Season Active',
];

export default function Home() {
  const { team, primary, setShowPicker } = useTheme();
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const tickerText = [...TICKER_ITEMS, ...TICKER_ITEMS].join('  ·  ');

  return (
    <div className="flex min-h-screen flex-col items-center bg-black font-sans text-white">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 w-full border-b theme-transition"
        style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">

          {/* Logo */}
          <h1 className="font-display text-4xl tracking-widest uppercase leading-none theme-transition cursor-pointer"
            onClick={() => router.push('/')}
            style={{ color: primary }}>
            Fan<span style={{ color: 'var(--gold)' }}>XI</span>
            <span className="font-mono text-xs tracking-widest ml-2 align-middle"
              style={{ color: 'rgba(255,255,255,0.3)' }}>HUB</span>
          </h1>

          {/* Right nav */}
          <div className="flex items-center gap-2">
            {team && (
              <button onClick={() => router.push('/nation')}
                className="flex items-center gap-2 px-4 py-2 border transition-all hover:border-white/30 hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                <span className="text-base">{team.flag}</span>
                <span className="font-mono text-[11px] tracking-widest uppercase">Intel</span>
              </button>
            )}

            <button onClick={() => router.push('/leaderboard')}
              className="px-4 py-2 border transition-all hover:border-white/30 hover:text-white"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              <span className="font-mono text-[11px] tracking-widest uppercase">Board</span>
            </button>

            {/* Team badge */}
            {team && (
              <button onClick={() => setShowPicker(true)}
                className="flex items-center gap-2 px-4 py-2 border theme-transition btn-cut"
                style={{ background: `${primary}18`, borderColor: primary, color: primary }}>
                <span className="text-base leading-none">{team.flag}</span>
                <span className="font-mono text-[11px] tracking-widest uppercase hidden sm:block font-bold">
                  {team.shortName}
                </span>
                <span className="text-xs opacity-50">✎</span>
              </button>
            )}

            {/* User chip */}
            <div className="flex items-center gap-3 px-4 py-2 border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
              <div className="hidden sm:block text-right">
                <div className="text-white font-bold text-sm leading-tight">{user.username}</div>
                <div className="font-mono text-[10px] tracking-wider uppercase leading-tight theme-transition"
                  style={{ color: primary }}>
                  {user.rank_title} · {user.football_iq_points} pts
                </div>
              </div>
              <button onClick={() => { logout(); router.push('/login'); }}
                className="text-white/30 hover:text-red-400 transition-colors text-base leading-none"
                title="Logout">⏻</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── TICKER ── */}
      <div className="w-full overflow-hidden relative z-10 py-3 theme-transition"
        style={{ background: primary, color: '#000' }}>
        <div className="ticker-inner font-bold">{tickerText} &nbsp;&nbsp; {tickerText}</div>
      </div>

      {/* ── CONTENT ── */}
      <div className="w-full max-w-5xl px-4 py-8 flex flex-col gap-6 relative z-10">
        <Countdown />
        <main><PitchBoard /></main>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UserStats />
          <MiniLeaderboard />
        </div>
        <footer className="mt-2 pb-8 text-center font-mono text-[11px] tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          Matchday Haki Connection · Secured
        </footer>
      </div>
    </div>
  );
}
