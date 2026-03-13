'use client';

import { useEffect, useState } from 'react';

interface Slide {
  text: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    text: (
      <>
        <span className="text-white/60">🏆 Defending Champions</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white">🇦🇷 Argentina</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white/60">Lionel Scaloni</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>Won 2022 in Qatar</span>
      </>
    ),
  },
  {
    text: (
      <>
        <span className="text-white/60">🏟️ Host Nations</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white">🇺🇸 USA</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white">🇨🇦 Canada</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white">🇲🇽 Mexico</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#dc2626' }}>16 venues</span>
      </>
    ),
  },
  {
    text: (
      <>
        <span className="text-white/60">⭐ Stars to Watch</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>Mbappé</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>Vinicius Jr</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>Pedri</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>Bellingham</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>Yamal</span>
      </>
    ),
  },
  {
    text: (
      <>
        <span className="text-white/60">📅 Opening Match</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#dc2626' }}>Jun 11, 2026</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white">Mexico vs Ecuador</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white/60">Estadio Azteca</span>
      </>
    ),
  },
  {
    text: (
      <>
        <span className="text-white/60">🌍 First 48-team World Cup</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#dc2626' }}>104 matches</span>
        <span className="text-white/20 mx-2">·</span>
        <span className="text-white">12 groups</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>1 champion</span>
      </>
    ),
  },
  {
    text: (
      <>
        <span className="text-white/60">🧠 Most predicted formation</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#dc2626' }}>4-3-3</span>
        <span className="text-white/20 mx-2">·</span>
        <span style={{ color: '#f59e0b' }}>57% of FanXI scouts</span>
      </>
    ),
  },
];

export default function IdentityStrip() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SLIDES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-full flex items-center justify-center"
      style={{
        height: '44px',
        background: 'rgba(0,0,0,0.30)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="font-display text-center transition-opacity duration-300 px-4"
        style={{
          fontSize: '13px',
          opacity: visible ? 1 : 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {SLIDES[index].text}
      </div>
    </div>
  );
}
