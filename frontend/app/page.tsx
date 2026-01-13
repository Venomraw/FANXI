'use client'; // Needed for the tab switching state
import { useState } from "react";
import PitchBoard from "@/src/components/pitch/PitchBoard";
import TacticalSliders from "@/src/components/TacticalSliders";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'squad' | 'tactics'>('squad');

  return (
    <div className="flex min-h-screen flex-col items-center bg-black font-sans text-white p-4">
      <header className="py-8 flex flex-col items-center gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-green-500 uppercase italic">
          FanXI Hub
        </h1>
        
        {/* --- THE TAB SWITCHER --- */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 mt-6">
          <button 
            onClick={() => setActiveTab('squad')}
            className={`px-8 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'squad' ? 'bg-green-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'
            }`}
          >
            SQUAD
          </button>
          <button 
            onClick={() => setActiveTab('tactics')}
            className={`px-8 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'tactics' ? 'bg-green-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'
            }`}
          >
            TACTICS
          </button>
        </div>
      </header>

      <main className="w-full max-w-4xl mt-4">
        {/* --- CONDITIONAL RENDERING --- */}
        {activeTab === 'squad' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <PitchBoard />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">
             <TacticalSliders />
          </div>
        )}
      </main>

      <footer className="mt-12 text-zinc-600 text-xs font-mono uppercase tracking-widest">
        Matchday Haki Connection: Secured 🔒
      </footer>
    </div>
  );
}