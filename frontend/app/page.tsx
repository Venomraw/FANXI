'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PitchBoard from "@/src/components/pitch/PitchBoard";
import { useTheme } from "@/src/context/ThemeContext";
import { useAuth } from "@/src/context/AuthContext";

export default function Home() {
  const { team, primary, setShowPicker } = useTheme();
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-black font-sans text-white p-4">
      <header className="py-6 w-full max-w-4xl flex items-center justify-between">
        {/* Logo */}
        <h1 className="text-4xl font-black tracking-tighter uppercase italic"
          style={{ color: primary }}>
          FanXI Hub
        </h1>

        {/* Right side: nav + team + user */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/leaderboard')}
            className="px-3 py-2 text-[10px] font-black uppercase rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white">
            🏆 Board
          </button>
          {/* Team badge */}
          {team && (
            <button onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-all">
              <span className="text-lg">{team.flag}</span>
              <span className="text-white text-xs font-bold hidden sm:block">{team.name}</span>
              <span className="text-zinc-600 text-xs">✎</span>
            </button>
          )}

          {/* User info */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="text-right hidden sm:block">
              <div className="text-white text-xs font-bold">{user.username}</div>
              <div className="text-[10px] uppercase" style={{ color: primary }}>{user.rank_title} · {user.football_iq_points} pts</div>
            </div>
            <button onClick={() => { logout(); router.push('/login'); }}
              className="text-zinc-600 hover:text-red-400 text-xs transition-colors ml-1"
              title="Logout">
              ⏻
            </button>
          </div>
        </div>
        </div>
      </header>

      <main className="w-full max-w-4xl mt-4">
        <PitchBoard />
      </main>

      <footer className="mt-12 text-zinc-600 text-xs font-mono uppercase tracking-widest">
        Matchday Haki Connection: Secured
      </footer>
    </div>
  );
}
