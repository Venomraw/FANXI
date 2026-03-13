'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Champion {
  year: number;
  country: string;
  flag: string;
  final: string;
  host: string;
  topScorer: string;
  manager: string;
  funFact: string;
  is2026?: boolean;
}

const CHAMPIONS: Champion[] = [
  { year: 1930, country: 'Uruguay', flag: '🇺🇾', final: 'URU 4–2 ARG', host: 'Uruguay', topScorer: 'Guillermo Stábile (8 goals)', manager: 'Alberto Suppici', funFact: 'First ever World Cup. No European teams attended due to travel costs.' },
  { year: 1934, country: 'Italy', flag: '🇮🇹', final: 'ITA 2–1 CZE (AET)', host: 'Italy', topScorer: 'Oldřich Nejedlý (5 goals)', manager: 'Vittorio Pozzo', funFact: 'Uruguay refused to defend their title in protest.' },
  { year: 1938, country: 'Italy', flag: '🇮🇹', final: 'ITA 4–2 HUN', host: 'France', topScorer: 'Leônidas (7 goals)', manager: 'Vittorio Pozzo', funFact: 'Italy became the first team to defend the World Cup.' },
  { year: 1950, country: 'Uruguay', flag: '🇺🇾', final: 'URU 2–1 BRA (final group stage)', host: 'Brazil', topScorer: 'Ademir (9 goals)', manager: 'Juan López', funFact: 'The Maracanazo — Uruguay shocked host Brazil in front of 200,000 fans.' },
  { year: 1954, country: 'West Germany', flag: '🇩🇪', final: 'WGR 3–2 HUN', host: 'Switzerland', topScorer: 'Sándor Kocsis (11 goals)', manager: 'Sepp Herberger', funFact: 'The Miracle of Bern — Hungary were unbeaten in 4 years before this final.' },
  { year: 1958, country: 'Brazil', flag: '🇧🇷', final: 'BRA 5–2 SWE', host: 'Sweden', topScorer: 'Just Fontaine (13 goals)', manager: 'Vicente Feola', funFact: "A 17-year-old Pelé scored twice in the final. Just Fontaine's record still stands." },
  { year: 1962, country: 'Brazil', flag: '🇧🇷', final: 'BRA 3–1 CZE', host: 'Chile', topScorer: 'Garrincha + Vavá (4 goals each)', manager: 'Aymoré Moreira', funFact: 'Pelé was injured in the second game. Garrincha carried Brazil to glory.' },
  { year: 1966, country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', final: 'ENG 4–2 WGR (AET)', host: 'England', topScorer: 'Eusébio (9 goals)', manager: 'Alf Ramsey', funFact: "England's only World Cup. Geoff Hurst scored a hat-trick in the final." },
  { year: 1970, country: 'Brazil', flag: '🇧🇷', final: 'BRA 4–1 ITA', host: 'Mexico', topScorer: 'Gerd Müller (10 goals)', manager: 'Mário Zagallo', funFact: 'Widely considered the greatest World Cup team ever. Pelé at his peak.' },
  { year: 1974, country: 'West Germany', flag: '🇩🇪', final: 'WGR 2–1 NED', host: 'West Germany', topScorer: 'Grzegorz Lato (7 goals)', manager: 'Helmut Schön', funFact: "Johan Cruyff's Total Football Netherlands lost the final to the hosts." },
  { year: 1978, country: 'Argentina', flag: '🇦🇷', final: 'ARG 3–1 NED (AET)', host: 'Argentina', topScorer: 'Mario Kempes (6 goals)', manager: 'César Luis Menotti', funFact: 'Hosts Argentina won on home soil. Ticker tape raining in Buenos Aires.' },
  { year: 1982, country: 'Italy', flag: '🇮🇹', final: 'ITA 3–1 WGR', host: 'Spain', topScorer: 'Paolo Rossi (6 goals)', manager: 'Enzo Bearzot', funFact: 'Paolo Rossi returned from a match-fixing ban to become tournament hero.' },
  { year: 1986, country: 'Argentina', flag: '🇦🇷', final: 'ARG 3–2 WGR', host: 'Mexico', topScorer: 'Gary Lineker (6 goals)', manager: 'Carlos Bilardo', funFact: "Maradona's Hand of God and Goal of the Century — both in one game vs England." },
  { year: 1990, country: 'West Germany', flag: '🇩🇪', final: 'WGR 1–0 ARG', host: 'Italy', topScorer: 'Salvatore Schillaci (6 goals)', manager: 'Franz Beckenbauer', funFact: 'The lowest-scoring World Cup final ever. Won by a penalty.' },
  { year: 1994, country: 'Brazil', flag: '🇧🇷', final: 'BRA 0–0 ITA (3–2 pens)', host: 'USA', topScorer: 'Hristo Stoichkov + Oleg Salenko (6 goals)', manager: 'Carlos Alberto Parreira', funFact: "Roberto Baggio missed the decisive penalty. Italy's greatest heartbreak." },
  { year: 1998, country: 'France', flag: '🇫🇷', final: 'FRA 3–0 BRA', host: 'France', topScorer: 'Davor Šuker (6 goals)', manager: 'Aimé Jacquet', funFact: 'Zidane scored twice. Ronaldo played despite a mysterious illness before the final.' },
  { year: 2002, country: 'Brazil', flag: '🇧🇷', final: 'BRA 2–0 GER', host: 'South Korea/Japan', topScorer: 'Ronaldo (8 goals)', manager: 'Luiz Felipe Scolari', funFact: "Ronaldo's redemption. South Korea became the first Asian team to reach the semis." },
  { year: 2006, country: 'Italy', flag: '🇮🇹', final: 'ITA 1–1 FRA (5–3 pens)', host: 'Germany', topScorer: 'Miroslav Klose (5 goals)', manager: 'Marcello Lippi', funFact: 'Zidane headbutted Materazzi in his final ever match. Italy won on penalties.' },
  { year: 2010, country: 'Spain', flag: '🇪🇸', final: 'ESP 1–0 NED (AET)', host: 'South Africa', topScorer: 'Thomas Müller + 4 others (5 goals)', manager: 'Vicente del Bosque', funFact: "First African World Cup. Spain's tiki-taka dominated. Iniesta's extra-time winner." },
  { year: 2014, country: 'Germany', flag: '🇩🇪', final: 'GER 1–0 ARG (AET)', host: 'Brazil', topScorer: 'James Rodríguez (6 goals)', manager: 'Joachim Löw', funFact: 'Germany 7–1 Brazil in the semi-final. The most shocking result in WC history.' },
  { year: 2018, country: 'France', flag: '🇫🇷', final: 'FRA 4–2 CRO', host: 'Russia', topScorer: 'Harry Kane (6 goals)', manager: 'Didier Deschamps', funFact: "France won with the youngest squad since Pelé's Brazil. Mbappé was 19." },
  { year: 2022, country: 'Argentina', flag: '🇦🇷', final: 'ARG 3–3 FRA (4–2 pens)', host: 'Qatar', topScorer: 'Kylian Mbappé (8 goals)', manager: 'Lionel Scaloni', funFact: 'Greatest final ever played. Mbappé scored a hat-trick. Messi finally won it.' },
  { year: 2026, country: '???', flag: '🏆', final: 'TBD', host: 'USA / Canada / Mexico', topScorer: '???', manager: '???', funFact: 'First 48-team World Cup. Who writes history?', is2026: true },
];

interface ModalData extends Champion {
  isOpen: boolean;
}

export default function ChampionsTimeline() {
  const [modal, setModal] = useState<ModalData | null>(null);

  function openModal(champ: Champion) {
    if (champ.is2026) return; // 2026 card links to /predict instead
    setModal({ ...champ, isOpen: true });
  }

  function closeModal() {
    setModal(null);
  }

  return (
    <>
      {/* Red connector line */}
      <div
        className="w-full mb-6"
        style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #dc2626 20%, #dc2626 80%, transparent)' }}
      />

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {CHAMPIONS.map((champ) => {
          if (champ.is2026) {
            return (
              <Link
                key={champ.year}
                href="/predict"
                className="block rounded-xl p-4 cursor-pointer transition-all duration-300 text-center relative overflow-hidden group"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(245,158,11,0.6)',
                  animation: 'predictPulse 2.5s ease-in-out infinite',
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0"
                  style={{ background: '#dc2626', fontSize: '9px', padding: '2px 0', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase', color: '#fff', textAlign: 'center' }}
                >
                  YOUR PREDICTION
                </div>
                <div className="mt-4">
                  <div className="text-3xl mb-1">{champ.flag}</div>
                  <div className="font-mono text-amber-400 text-sm font-semibold">{champ.year}</div>
                  <div className="font-sans text-white font-bold mt-1" style={{ fontSize: '13px' }}>
                    Who wins?
                  </div>
                  <div className="font-mono text-white/40 mt-1" style={{ fontSize: '10px' }}>
                    48 teams · Click to predict
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <button
              key={champ.year}
              onClick={() => openModal(champ)}
              className="rounded-xl p-4 cursor-pointer hover:scale-105 transition-all duration-300 text-center group"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <div className="text-3xl mb-1">{champ.flag}</div>
              <div className="font-mono text-amber-400 text-sm font-semibold" style={{ color: '#f59e0b' }}>
                {champ.year}
              </div>
              <div className="font-sans text-white font-bold mt-1" style={{ fontSize: '13px' }}>
                {champ.country}
              </div>
              <div className="font-mono text-white/30 mt-1" style={{ fontSize: '10px' }}>
                {champ.final.split(' ')[0] + ' ' + champ.final.split(' ')[1]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
          onClick={closeModal}
        >
          <div
            className="rounded-2xl p-8 max-w-lg w-full relative"
            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              style={{ fontSize: '20px', lineHeight: 1 }}
              aria-label="Close"
            >
              ×
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <span style={{ fontSize: '56px', lineHeight: 1 }}>{modal.flag}</span>
              <div>
                <div className="font-mono text-amber-400 text-sm">{modal.year}</div>
                <div className="font-sans text-white font-bold" style={{ fontSize: '28px', lineHeight: 1.1 }}>
                  {modal.country}
                </div>
                <div className="font-mono text-white/40" style={{ fontSize: '11px', marginTop: '4px' }}>
                  WORLD CUP CHAMPIONS
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <div
                  className="rounded-lg px-3 py-2 flex-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="font-mono text-white/40 mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>FINAL</div>
                  <div className="font-display text-white font-semibold" style={{ fontSize: '14px' }}>{modal.final}</div>
                </div>
                <div
                  className="rounded-lg px-3 py-2 flex-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="font-mono text-white/40 mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>HOST</div>
                  <div className="font-display text-white font-semibold" style={{ fontSize: '14px' }}>{modal.host}</div>
                </div>
              </div>

              <div
                className="rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="font-mono text-white/40 mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>GOLDEN BOOT</div>
                <div className="font-display text-amber-400 font-semibold" style={{ fontSize: '14px' }}>{modal.topScorer}</div>
              </div>

              <div
                className="rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="font-mono text-white/40 mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>MANAGER</div>
                <div className="font-display text-white font-semibold" style={{ fontSize: '14px' }}>{modal.manager}</div>
              </div>

              <div
                className="rounded-lg px-4 py-3"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}
              >
                <div className="font-mono text-red-500 mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                  FUN FACT
                </div>
                <p className="font-sans text-white/80" style={{ fontSize: '14px', lineHeight: 1.6 }}>
                  {modal.funFact}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
