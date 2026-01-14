'use client';
import React, { useState } from 'react';

export default function MatchEvents() {
  const [fouls, setFouls] = useState<'Home' | 'Draw' | 'Away' | null>(null);
  const [cards, setCards] = useState(0);

  return (
    <div className="flex flex-col gap-8 p-6 bg-zinc-900 rounded-2xl border border-zinc-800 text-white">
      <h2 className="text-xl font-bold text-green-500">Match Predictions</h2>

      {/* 1. POLL STYLE: More Fouls */}
      <div className="space-y-4">
        <p className="text-sm font-semibold">Which team will commit more fouls?</p>
        <div className="flex gap-2">
          {['Home', 'Draw', 'Away'].map((option) => (
            <button
              key={option}
              onClick={() => setFouls(option as any)}
              className={`flex-1 py-3 rounded-xl border transition-all ${
                fouls === option 
                ? 'bg-green-600 border-green-400' 
                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* 2. WEIGHTED SLIDER: Yellow Cards */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <p className="text-sm font-semibold">Total Yellow Cards</p>
          <span className="text-green-500 font-bold">{cards}</span>
        </div>
        <input 
          type="range" min="0" max="15" value={cards}
          onChange={(e) => setCards(parseInt(e.target.value))}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-500"
        />
        <p className="text-[10px] text-zinc-500 italic">*Weighted: Points awarded for near misses!</p>
      </div>

      {/* 3. SEARCH STYLE: First Scorer (Placeholder for now) */}
      <div className="space-y-4">
        <p className="text-sm font-semibold">Predict First Scorer</p>
        <input 
          type="text" 
          placeholder="Search player name..."
          className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-green-500"
        />
      </div>
    </div>
  );
}