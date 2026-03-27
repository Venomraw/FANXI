'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WCTeam, DEFAULT_THEME, getTeamById } from '@/src/data/teamColors';

interface ThemeContextValue {
  team: WCTeam | null;
  primary: string;
  accent: string;
  text: string;
  setTeam: (team: WCTeam) => void;
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  team: null,
  primary: DEFAULT_THEME.primary,
  accent: DEFAULT_THEME.accent,
  text: DEFAULT_THEME.text,
  setTeam: () => {},
  showPicker: false,
  setShowPicker: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeamState] = useState<WCTeam | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  function applyTeam(t: WCTeam) {
    document.documentElement.style.setProperty('--team-primary', t.primary);
    document.documentElement.style.setProperty('--team-accent', t.accent);
    document.documentElement.style.setProperty('--team-text', t.text);
  }

  // On mount: load saved team from localStorage, or show picker
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const saved = localStorage.getItem('fanxi_team');
    if (saved) {
      const found = getTeamById(saved);
      if (found) {
        applyTeam(found);
        setTeam(found);
        return;
      }
    }
    setShowPicker(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setTeam(t: WCTeam) {
    setTeamState(t);
    applyTeam(t);
    localStorage.setItem('fanxi_team', t.id);
    setShowPicker(false);
  }

  const primary = team?.primary ?? DEFAULT_THEME.primary;
  const accent = team?.accent ?? DEFAULT_THEME.accent;
  const text = team?.text ?? DEFAULT_THEME.text;

  return (
    <ThemeContext.Provider value={{ team, primary, accent, text, setTeam, showPicker, setShowPicker }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
