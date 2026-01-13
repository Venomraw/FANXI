'use client'; // Required in Next.js App Router for interactive components

import { useState } from 'react';

export default function TacticalSliders() {
  // --- STATE HAKI: Managing local data before it hits the vault ---
  const [pressing, setPressing] = useState(50);
  const [mentality, setMentality] = useState("Balanced");
  // Added a state for team_id to ensure it's never 'null' when sent
  const [selectedTeamId, setSelectedTeamId] = useState(1); 

  // --- THE TRANSMISSION: Sending data to the Grand Line (Backend) ---
  const submitTactics = async () => {
    try {
      // We call our FastAPI endpoint using the absolute URL
      // Ensure match_id in the URL matches the match_id in the body if required
      const response = await fetch('http://127.0.0.1:8000/matches/1/predictions', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          user_id: 1, 
          match_id: 1, // Explicitly sending match_id
          team_id: selectedTeamId, // Ensuring this is a valid integer, not null
          formation: "4-3-3",
          mentality: mentality,
          pressing_intensity: pressing,
          players: [
            "Player 1", "Player 2", "Player 3", "Player 4", "Player 5", 
            "Player 6", "Player 7", "Player 8", "Player 9", "Player 10", "Player 11"
          ]
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert("Success: " + data.message);
      } else {
        // Log detailed validation errors from Pydantic if they occur
        console.error("Validation Error Details:", data.detail);
        alert("Error: " + (data.detail?.[0]?.msg || "Validation Failed"));
      }
    } catch (error) {
      console.error("Connection failed:", error);
      alert("The ship couldn't reach the dock. Is the Backend running?");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gray-900 border-2 border-green-500 rounded-2xl shadow-2xl text-white">
      <h2 className="text-2xl font-bold mb-6 text-center text-green-400 font-mono tracking-widest uppercase">
        Tactical Hub
      </h2>

      {/* --- TEAM SELECTOR (Safety measure for team_id) --- */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 opacity-70 text-green-200">SELECT TEAM ID</label>
        <input 
          type="number" 
          className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(parseInt(e.target.value) || 1)}
        />
      </div>
      
      {/* --- PRESSING SLIDER --- */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 opacity-70">
          PRESSING INTENSITY: <span className="text-green-400 font-bold">{pressing}</span>
        </label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          value={pressing}
          onChange={(e) => setPressing(parseInt(e.target.value))}
        />
      </div>

      {/* --- MENTALITY SELECTOR --- */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2 opacity-70 uppercase tracking-tighter">Team Mentality</label>
        <select 
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-300"
          value={mentality}
          onChange={(e) => setMentality(e.target.value)}
        >
          <option value="Ultra Defensive">Ultra Defensive</option>
          <option value="Balanced">Balanced</option>
          <option value="Attacking">Attacking</option>
        </select>
      </div>

      {/* --- SUBMISSION BUTTON --- */}
      <button 
        onClick={submitTactics}
        className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-lg transition-all active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
      >
        LOCK TACTICAL HAKI 🔒
      </button>
    </div>
  );
}