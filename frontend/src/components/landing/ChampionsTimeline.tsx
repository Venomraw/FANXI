'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Champion {
  year: number;
  country: string;
  flag: string;
  abbr: string;
  final: string;
  host: string;
  topScorer: string;
  goldenBoot: string;
  manager: string;
  funFact: string;
  wins: number;
  flagColors: [string, string];
  is2026?: boolean;
}

const CHAMPIONS: Champion[] = [
  { year: 1930, country: 'Uruguay', flag: '\u{1F1FA}\u{1F1FE}', abbr: 'URU', final: 'URU 4\u20132 ARG', host: 'Uruguay', topScorer: 'Guillermo St\u00e1bile (8 goals)', goldenBoot: 'Guillermo St\u00e1bile', manager: 'Alberto Suppici', funFact: 'First ever World Cup. No European teams attended due to travel costs.', wins: 2, flagColors: ['#5CBEFF', '#FFFFFF'] },
  { year: 1934, country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', abbr: 'ITA', final: 'ITA 2\u20131 CZE (AET)', host: 'Italy', topScorer: 'Old\u0159ich Nejedl\u00fd (5 goals)', goldenBoot: 'Old\u0159ich Nejedl\u00fd', manager: 'Vittorio Pozzo', funFact: 'Uruguay refused to defend their title in protest.', wins: 4, flagColors: ['#009246', '#CE2B37'] },
  { year: 1938, country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', abbr: 'ITA', final: 'ITA 4\u20132 HUN', host: 'France', topScorer: 'Le\u00f4nidas (7 goals)', goldenBoot: 'Le\u00f4nidas', manager: 'Vittorio Pozzo', funFact: 'Italy became the first team to defend the World Cup.', wins: 4, flagColors: ['#009246', '#CE2B37'] },
  { year: 1950, country: 'Uruguay', flag: '\u{1F1FA}\u{1F1FE}', abbr: 'URU', final: 'URU 2\u20131 BRA (final group stage)', host: 'Brazil', topScorer: 'Ademir (9 goals)', goldenBoot: 'Ademir', manager: 'Juan L\u00f3pez', funFact: 'The Maracanazo \u2014 Uruguay shocked host Brazil in front of 200,000 fans.', wins: 2, flagColors: ['#5CBEFF', '#FFFFFF'] },
  { year: 1954, country: 'West Germany', flag: '\u{1F1E9}\u{1F1EA}', abbr: 'GER', final: 'WGR 3\u20132 HUN', host: 'Switzerland', topScorer: 'S\u00e1ndor Kocsis (11 goals)', goldenBoot: 'S\u00e1ndor Kocsis', manager: 'Sepp Herberger', funFact: 'The Miracle of Bern \u2014 Hungary were unbeaten in 4 years before this final.', wins: 4, flagColors: ['#000000', '#DD0000'] },
  { year: 1958, country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', abbr: 'BRA', final: 'BRA 5\u20132 SWE', host: 'Sweden', topScorer: 'Just Fontaine (13 goals)', goldenBoot: 'Just Fontaine', manager: 'Vicente Feola', funFact: "A 17-year-old Pel\u00e9 scored twice in the final. Just Fontaine's record still stands.", wins: 5, flagColors: ['#009C3B', '#FFDF00'] },
  { year: 1962, country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', abbr: 'BRA', final: 'BRA 3\u20131 CZE', host: 'Chile', topScorer: 'Garrincha + Vav\u00e1 (4 goals each)', goldenBoot: 'Garrincha / Vav\u00e1', manager: 'Aymor\u00e9 Moreira', funFact: 'Pel\u00e9 was injured in the second game. Garrincha carried Brazil to glory.', wins: 5, flagColors: ['#009C3B', '#FFDF00'] },
  { year: 1966, country: 'England', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', abbr: 'ENG', final: 'ENG 4\u20132 WGR (AET)', host: 'England', topScorer: 'Eus\u00e9bio (9 goals)', goldenBoot: 'Eus\u00e9bio', manager: 'Alf Ramsey', funFact: "England's only World Cup. Geoff Hurst scored a hat-trick in the final.", wins: 1, flagColors: ['#FFFFFF', '#CE1124'] },
  { year: 1970, country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', abbr: 'BRA', final: 'BRA 4\u20131 ITA', host: 'Mexico', topScorer: 'Gerd M\u00fcller (10 goals)', goldenBoot: 'Gerd M\u00fcller', manager: 'M\u00e1rio Zagallo', funFact: 'Widely considered the greatest World Cup team ever. Pel\u00e9 at his peak.', wins: 5, flagColors: ['#009C3B', '#FFDF00'] },
  { year: 1974, country: 'West Germany', flag: '\u{1F1E9}\u{1F1EA}', abbr: 'GER', final: 'WGR 2\u20131 NED', host: 'West Germany', topScorer: 'Grzegorz Lato (7 goals)', goldenBoot: 'Grzegorz Lato', manager: 'Helmut Sch\u00f6n', funFact: "Johan Cruyff's Total Football Netherlands lost the final to the hosts.", wins: 4, flagColors: ['#000000', '#DD0000'] },
  { year: 1978, country: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', abbr: 'ARG', final: 'ARG 3\u20131 NED (AET)', host: 'Argentina', topScorer: 'Mario Kempes (6 goals)', goldenBoot: 'Mario Kempes', manager: 'C\u00e9sar Luis Menotti', funFact: 'Hosts Argentina won on home soil. Ticker tape raining in Buenos Aires.', wins: 3, flagColors: ['#74ACDF', '#FFFFFF'] },
  { year: 1982, country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', abbr: 'ITA', final: 'ITA 3\u20131 WGR', host: 'Spain', topScorer: 'Paolo Rossi (6 goals)', goldenBoot: 'Paolo Rossi', manager: 'Enzo Bearzot', funFact: 'Paolo Rossi returned from a match-fixing ban to become tournament hero.', wins: 4, flagColors: ['#009246', '#CE2B37'] },
  { year: 1986, country: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', abbr: 'ARG', final: 'ARG 3\u20132 WGR', host: 'Mexico', topScorer: 'Gary Lineker (6 goals)', goldenBoot: 'Gary Lineker', manager: 'Carlos Bilardo', funFact: "Maradona's Hand of God and Goal of the Century \u2014 both in one game vs England.", wins: 3, flagColors: ['#74ACDF', '#FFFFFF'] },
  { year: 1990, country: 'West Germany', flag: '\u{1F1E9}\u{1F1EA}', abbr: 'GER', final: 'WGR 1\u20130 ARG', host: 'Italy', topScorer: 'Salvatore Schillaci (6 goals)', goldenBoot: 'Salvatore Schillaci', manager: 'Franz Beckenbauer', funFact: 'The lowest-scoring World Cup final ever. Won by a penalty.', wins: 4, flagColors: ['#000000', '#DD0000'] },
  { year: 1994, country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', abbr: 'BRA', final: 'BRA 0\u20130 ITA (3\u20132 pens)', host: 'USA', topScorer: 'Hristo Stoichkov + Oleg Salenko (6 goals)', goldenBoot: 'Stoichkov / Salenko', manager: 'Carlos Alberto Parreira', funFact: "Roberto Baggio missed the decisive penalty. Italy's greatest heartbreak.", wins: 5, flagColors: ['#009C3B', '#FFDF00'] },
  { year: 1998, country: 'France', flag: '\u{1F1EB}\u{1F1F7}', abbr: 'FRA', final: 'FRA 3\u20130 BRA', host: 'France', topScorer: 'Davor \u0160uker (6 goals)', goldenBoot: 'Davor \u0160uker', manager: 'Aim\u00e9 Jacquet', funFact: 'Zidane scored twice. Ronaldo played despite a mysterious illness before the final.', wins: 2, flagColors: ['#002395', '#ED2939'] },
  { year: 2002, country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', abbr: 'BRA', final: 'BRA 2\u20130 GER', host: 'South Korea/Japan', topScorer: 'Ronaldo (8 goals)', goldenBoot: 'Ronaldo', manager: 'Luiz Felipe Scolari', funFact: "Ronaldo's redemption. South Korea became the first Asian team to reach the semis.", wins: 5, flagColors: ['#009C3B', '#FFDF00'] },
  { year: 2006, country: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', abbr: 'ITA', final: 'ITA 1\u20131 FRA (5\u20133 pens)', host: 'Germany', topScorer: 'Miroslav Klose (5 goals)', goldenBoot: 'Miroslav Klose', manager: 'Marcello Lippi', funFact: 'Zidane headbutted Materazzi in his final ever match. Italy won on penalties.', wins: 4, flagColors: ['#009246', '#CE2B37'] },
  { year: 2010, country: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', abbr: 'ESP', final: 'ESP 1\u20130 NED (AET)', host: 'South Africa', topScorer: 'Thomas M\u00fcller + 4 others (5 goals)', goldenBoot: 'Thomas M\u00fcller', manager: 'Vicente del Bosque', funFact: "First African World Cup. Spain's tiki-taka dominated. Iniesta's extra-time winner.", wins: 1, flagColors: ['#AA151B', '#F1BF00'] },
  { year: 2014, country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', abbr: 'GER', final: 'GER 1\u20130 ARG (AET)', host: 'Brazil', topScorer: 'James Rodr\u00edguez (6 goals)', goldenBoot: 'James Rodr\u00edguez', manager: 'Joachim L\u00f6w', funFact: 'Germany 7\u20131 Brazil in the semi-final. The most shocking result in WC history.', wins: 4, flagColors: ['#000000', '#DD0000'] },
  { year: 2018, country: 'France', flag: '\u{1F1EB}\u{1F1F7}', abbr: 'FRA', final: 'FRA 4\u20132 CRO', host: 'Russia', topScorer: 'Harry Kane (6 goals)', goldenBoot: 'Harry Kane', manager: 'Didier Deschamps', funFact: "France won with the youngest squad since Pel\u00e9's Brazil. Mbapp\u00e9 was 19.", wins: 2, flagColors: ['#002395', '#ED2939'] },
  { year: 2022, country: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', abbr: 'ARG', final: 'ARG 3\u20133 FRA (4\u20132 pens)', host: 'Qatar', topScorer: 'Kylian Mbapp\u00e9 (8 goals)', goldenBoot: 'Kylian Mbapp\u00e9', manager: 'Lionel Scaloni', funFact: 'Greatest final ever played. Mbapp\u00e9 scored a hat-trick. Messi finally won it.', wins: 3, flagColors: ['#74ACDF', '#FFFFFF'] },
  { year: 2026, country: '???', flag: '\u{1F3C6}', abbr: '???', final: 'TBD', host: 'USA / Canada / Mexico', topScorer: '???', goldenBoot: '???', manager: '???', funFact: 'First 48-team World Cup. Who writes history?', wins: 0, flagColors: ['#FFD23F', '#dc2626'], is2026: true },
];

const WIN_COUNT_PILLS: { flag: string; abbr: string; wins: number }[] = [
  { flag: '\u{1F1E7}\u{1F1F7}', abbr: 'BRA', wins: 5 },
  { flag: '\u{1F1E9}\u{1F1EA}', abbr: 'GER', wins: 4 },
  { flag: '\u{1F1EE}\u{1F1F9}', abbr: 'ITA', wins: 4 },
  { flag: '\u{1F1E6}\u{1F1F7}', abbr: 'ARG', wins: 3 },
  { flag: '\u{1F1EB}\u{1F1F7}', abbr: 'FRA', wins: 2 },
  { flag: '\u{1F1FA}\u{1F1FE}', abbr: 'URU', wins: 2 },
];

const ITEM_WIDTH = 100;

export default function ChampionsTimeline() {
  const router = useRouter();
  const railRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = CHAMPIONS.findIndex((c) => c.year === 2022);
    return idx >= 0 ? idx : CHAMPIONS.length - 2;
  });
  const [animKey, setAnimKey] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Touch tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const selected = CHAMPIONS[selectedIndex];

  const scrollToIndex = useCallback((idx: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const containerWidth = rail.clientWidth;
    const targetLeft = idx * ITEM_WIDTH + ITEM_WIDTH / 2 - containerWidth / 2;
    rail.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }, []);

  const updateScrollButtons = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanScrollLeft(rail.scrollLeft > 10);
    setCanScrollRight(rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 10);
  }, []);

  const selectYear = useCallback((idx: number) => {
    if (idx < 0 || idx >= CHAMPIONS.length) return;
    setSelectedIndex(idx);
    setAnimKey((k) => k + 1);
    scrollToIndex(idx);
  }, [scrollToIndex]);

  // Initial scroll + button state
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToIndex(selectedIndex);
      updateScrollButtons();
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedIndex, scrollToIndex, updateScrollButtons]);

  // Listen for scroll to update arrow visibility
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const handler = () => updateScrollButtons();
    rail.addEventListener('scroll', handler, { passive: true });
    return () => rail.removeEventListener('scroll', handler);
  }, [updateScrollButtons]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          setAnimKey((k) => k + 1);
          setTimeout(() => scrollToIndex(next), 0);
          return next;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(CHAMPIONS.length - 1, prev + 1);
          setAnimKey((k) => k + 1);
          setTimeout(() => scrollToIndex(next), 0);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scrollToIndex]);

  const scrollRail = (dir: 'left' | 'right') => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  // Touch/swipe on detail panel
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && selectedIndex < CHAMPIONS.length - 1) selectYear(selectedIndex + 1);
      if (dx > 0 && selectedIndex > 0) selectYear(selectedIndex - 1);
    }
  };

  const prevChamp = selectedIndex > 0 ? CHAMPIONS[selectedIndex - 1] : null;
  const nextChamp = selectedIndex < CHAMPIONS.length - 1 ? CHAMPIONS[selectedIndex + 1] : null;

  return (
    <section
      className="py-16 px-4"
      style={{ background: 'rgba(0,0,0,0.90)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* ── PART A: HEADER ── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div>
            <p
              className="font-display font-semibold uppercase tracking-wider text-red-600"
              style={{ fontSize: '13px', letterSpacing: '1.5px' }}
            >
              // WORLD CUP CHAMPIONS
            </p>
            <h2
              className="font-sans font-bold text-white mt-2"
              style={{ fontSize: 'clamp(28px, 5vw, 40px)' }}
            >
              Every winner since 1930
            </h2>
            <p
              className="font-display text-white/50 mt-1"
              style={{ fontSize: '14px' }}
            >
              21 tournaments &middot; 8 different nations
            </p>
          </div>

          {/* Win-count pills */}
          <div className="flex flex-wrap gap-2">
            {WIN_COUNT_PILLS.map((p) => (
              <span
                key={p.abbr}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  fontSize: '12px',
                }}
              >
                <span style={{ fontSize: '14px' }}>{p.flag}</span>
                <span className="font-display text-white/70">{p.wins}x</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── PART B: YEAR RAIL ── */}
        <div className="relative">
          {/* Left arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scrollRail('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 transition-opacity duration-300"
              style={{
                background: 'rgba(0,0,0,0.80)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              aria-label="Scroll left"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 4L6 8L10 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollRail('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 transition-opacity duration-300"
              style={{
                background: 'rgba(0,0,0,0.80)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              aria-label="Scroll right"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Scrollable rail */}
          <div
            ref={railRef}
            className="flex items-center overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <style>{`
              .champions-rail::-webkit-scrollbar { display: none; }
            `}</style>
            <div className="champions-rail flex items-center" style={{ minWidth: 'max-content' }} ref={(el) => {
              // Apply the class to parent for scrollbar hiding
              if (el && railRef.current) railRef.current.classList.add('champions-rail');
            }}>
              {CHAMPIONS.map((champ, i) => {
                const isSelected = i === selectedIndex;
                const is2026 = !!champ.is2026;

                return (
                  <div key={champ.year} className="flex items-center">
                    {/* Connecting line (not before first) */}
                    {i > 0 && (
                      <div
                        className="h-px flex-shrink-0"
                        style={{
                          width: '20px',
                          background: `linear-gradient(90deg, ${CHAMPIONS[i - 1].flagColors[0]}40, ${champ.flagColors[0]}40)`,
                        }}
                      />
                    )}

                    {/* Year item */}
                    <button
                      onClick={() => {
                        if (is2026) {
                          selectYear(i);
                        } else {
                          selectYear(i);
                        }
                      }}
                      className="flex flex-col items-center flex-shrink-0 py-3 px-2 transition-all duration-300 rounded-lg group"
                      style={{
                        width: `${ITEM_WIDTH - 20}px`,
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                        ...(is2026 && !isSelected ? { animation: 'predictPulse 2.5s ease-in-out infinite' } : {}),
                        ...(is2026 ? { border: '1px solid rgba(255,210,63,0.4)', borderRadius: '12px' } : {}),
                      }}
                      aria-label={`${champ.year} - ${champ.country}`}
                    >
                      {/* Year */}
                      <span
                        className="font-display font-semibold transition-colors duration-300"
                        style={{
                          fontSize: '14px',
                          color: is2026
                            ? '#dc2626'
                            : isSelected
                              ? '#f59e0b'
                              : 'rgba(255,255,255,0.40)',
                        }}
                      >
                        {champ.year}
                      </span>

                      {/* Flag */}
                      <span
                        className="transition-all duration-300 my-1"
                        style={{
                          fontSize: isSelected ? '24px' : '20px',
                        }}
                      >
                        {is2026 ? '???' : champ.flag}
                      </span>

                      {/* Abbreviation */}
                      <span
                        className="font-display transition-colors duration-300"
                        style={{
                          fontSize: '10px',
                          color: isSelected ? 'white' : 'rgba(255,255,255,0.35)',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {is2026 ? (
                          <span className="text-red-500" style={{ fontSize: '9px' }}>YOUR PICK</span>
                        ) : champ.abbr}
                      </span>

                      {/* Win stars */}
                      {!is2026 && champ.wins > 1 && (
                        <span
                          className="mt-0.5"
                          style={{
                            fontSize: '8px',
                            color: '#f59e0b',
                            letterSpacing: '1px',
                          }}
                        >
                          {Array.from({ length: champ.wins }, () => '\u2605').join('')}
                        </span>
                      )}

                      {/* Selected underline */}
                      {isSelected && (
                        <div
                          className="mt-1 rounded-full"
                          style={{
                            width: '24px',
                            height: '2px',
                            background: is2026 ? '#dc2626' : '#f59e0b',
                          }}
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── PART C: DETAIL PANEL ── */}
        <div
          key={animKey}
          className="mt-8 rounded-xl p-6 md:p-8"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.60), rgba(0,0,0,0.40))',
            backdropFilter: 'blur(12px)',
            borderLeft: `4px solid ${selected.flagColors[0]}`,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderLeftWidth: '4px',
            borderLeftColor: selected.flagColors[0],
            animation: 'detailSlideUp 300ms ease forwards',
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <style>{`
            @keyframes detailSlideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {selected.is2026 ? (
            /* ── 2026 Special Panel ── */
            <div className="text-center py-8">
              <span style={{ fontSize: '72px' }}>{selected.flag}</span>
              <h3
                className="font-sans font-bold text-white mt-4"
                style={{ fontSize: 'clamp(24px, 4vw, 36px)' }}
              >
                The next chapter is unwritten.
              </h3>
              <p
                className="font-display text-white/50 mt-2"
                style={{ fontSize: '15px' }}
              >
                48 nations. 104 matches. One champion. Will you call it?
              </p>
              <button
                onClick={() => router.push('/predict')}
                className="mt-8 font-display font-semibold text-white rounded-lg transition-all duration-500 hover:scale-105 inline-block"
                style={{
                  background: '#dc2626',
                  padding: '16px 36px',
                  fontSize: '18px',
                  animation: 'predictPulse 2.5s ease-in-out infinite',
                }}
              >
                Make Your Prediction &rarr;
              </button>
            </div>
          ) : (
            /* ── Standard Detail Panel ── */
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* LEFT COLUMN (3/5) */}
              <div className="lg:col-span-3">
                {/* Top: Flag + Country + Year badge */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span style={{ fontSize: '56px', lineHeight: 1 }}>{selected.flag}</span>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3
                        className="font-sans font-bold text-white"
                        style={{ fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: 1.1 }}
                      >
                        {selected.country}
                      </h3>
                      <span
                        className="font-display font-semibold text-white rounded px-3 py-1"
                        style={{ background: '#dc2626', fontSize: '13px' }}
                      >
                        {selected.year}
                      </span>
                    </div>
                    {selected.wins > 1 && (
                      <p
                        className="font-display mt-1"
                        style={{ color: '#f59e0b', fontSize: '14px' }}
                      >
                        <span style={{ letterSpacing: '1px' }}>
                          {Array.from({ length: selected.wins }, () => '\u2605').join(' ')}
                        </span>
                        {' '}{selected.wins}x World Champions
                      </p>
                    )}
                    {selected.wins === 1 && (
                      <p
                        className="font-display mt-1"
                        style={{ color: '#f59e0b', fontSize: '14px' }}
                      >
                        \u2605 World Champions
                      </p>
                    )}
                  </div>
                </div>

                <p className="font-display text-white/40 mt-2" style={{ fontSize: '13px' }}>
                  Hosted in {selected.host}
                </p>

                {/* Divider */}
                <div className="my-5" style={{ height: '1px', background: 'rgba(255,255,255,0.10)' }} />

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="font-display uppercase text-red-500" style={{ fontSize: '10px', letterSpacing: '1px' }}>FINAL</div>
                    <div className="font-display text-white font-semibold mt-1" style={{ fontSize: '14px' }}>{selected.final}</div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="font-display uppercase text-red-500" style={{ fontSize: '10px', letterSpacing: '1px' }}>GOLDEN BOOT</div>
                    <div className="font-display text-amber-400 font-semibold mt-1" style={{ fontSize: '14px' }}>{selected.goldenBoot}</div>
                    <div className="font-display text-white/30 mt-0.5" style={{ fontSize: '11px' }}>{selected.topScorer}</div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="font-display uppercase text-red-500" style={{ fontSize: '10px', letterSpacing: '1px' }}>MANAGER</div>
                    <div className="font-display text-white font-semibold mt-1" style={{ fontSize: '14px' }}>{selected.manager}</div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="font-display uppercase text-red-500" style={{ fontSize: '10px', letterSpacing: '1px' }}>HOST</div>
                    <div className="font-display text-white font-semibold mt-1" style={{ fontSize: '14px' }}>{selected.host}</div>
                  </div>
                </div>

                {/* Fun fact */}
                <div
                  className="mt-4 rounded-lg px-5 py-4"
                  style={{
                    borderLeft: '2px solid #dc2626',
                    background: 'rgba(220,38,38,0.05)',
                  }}
                >
                  <p
                    className="font-display italic text-white/70"
                    style={{ fontSize: '14px', lineHeight: 1.7 }}
                  >
                    &ldquo;{selected.funFact}&rdquo;
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN (2/5) — Decorative */}
              <div className="lg:col-span-2 hidden lg:flex flex-col items-center justify-center relative overflow-hidden">
                {/* Large flag */}
                <span
                  style={{
                    fontSize: '120px',
                    opacity: 0.15,
                    filter: 'blur(1px)',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {selected.flag}
                </span>
                {/* Color circles */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '200px',
                    height: '200px',
                    background: selected.flagColors[0],
                    opacity: 0.12,
                    filter: 'blur(60px)',
                    top: '20%',
                    left: '30%',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: '160px',
                    height: '160px',
                    background: selected.flagColors[1],
                    opacity: 0.10,
                    filter: 'blur(50px)',
                    bottom: '20%',
                    right: '25%',
                  }}
                />
              </div>
            </div>
          )}

          {/* Navigation row */}
          <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {prevChamp ? (
              <button
                onClick={() => selectYear(selectedIndex - 1)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
              >
                <span className="text-white/50">&larr;</span>
                <span style={{ fontSize: '16px' }}>{prevChamp.flag}</span>
                <span className="font-display text-white/70">{prevChamp.year}</span>
              </button>
            ) : (
              <div />
            )}

            {/* Dots */}
            <div className="hidden sm:flex items-center gap-1">
              {CHAMPIONS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === selectedIndex ? '12px' : '3px',
                    height: '3px',
                    background: i === selectedIndex ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>

            {nextChamp ? (
              <button
                onClick={() => selectYear(selectedIndex + 1)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
              >
                <span className="font-display text-white/70">{nextChamp.year}</span>
                <span style={{ fontSize: '16px' }}>{nextChamp.flag}</span>
                <span className="text-white/50">&rarr;</span>
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
