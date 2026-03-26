'use client';

import { useState } from 'react';

interface HistoryEntry {
  year: number;
  event: string;
  teams: string;
  score?: string;
  detail: string;
}

const WC_HISTORY: Record<string, HistoryEntry[]> = {
  '06-13': [{ year: 1986, event: 'Hand of God & Goal of the Century', teams: 'Argentina vs England', score: '2–1', detail: 'Maradona scored with his hand then the Goal of the Century in the same game.' }],
  '07-08': [{ year: 2014, event: 'The 7–1', teams: 'Brazil vs Germany', score: '1–7', detail: 'Germany humiliated hosts Brazil in the most shocking result in World Cup history.' }],
  '07-13': [{ year: 2014, event: "Götze's Golden Goal", teams: 'Germany vs Argentina', score: '1–0 AET', detail: "Mario Götze controlled Schürrle's cross on his chest and volleyed home in extra time." }],
  '07-15': [{ year: 2018, event: 'France Win Their Second', teams: 'France vs Croatia', score: '4–2', detail: 'Mbappé became the second teenager after Pelé to score in a World Cup final.' }],
  '07-11': [{ year: 2010, event: "Iniesta's Immortal Moment", teams: 'Spain vs Netherlands', score: '1–0 AET', detail: 'Andrés Iniesta scored in extra time to give Spain their first World Cup.' }],
  '06-29': [{ year: 1986, event: 'The Goal of the Century', teams: 'Argentina vs England', score: '2–1', detail: "FIFA voted Maradona's second goal the greatest in World Cup history." }],
  '07-04': [{ year: 2006, event: "Zidane's Headbutt", teams: 'France vs Italy', score: '1–1 (3–5 pens)', detail: 'Zidane headbutted Materazzi in his final ever match. France lost on penalties.' }],
  '06-17': [{ year: 1970, event: 'The Save of the Century', teams: 'Brazil vs England', score: '1–0', detail: 'Gordon Banks made what Pelé called the greatest save he had ever seen.' }],
  '06-25': [{ year: 2014, event: 'Suárez Bites Chiellini', teams: 'Uruguay vs Italy', score: '1–0', detail: "Suárez bit Chiellini during the match in one of football's most notorious incidents." }],
  '06-21': [{ year: 2014, event: 'Messi Hat-trick vs Bosnia', teams: 'Argentina vs Bosnia', score: '2–1', detail: 'Messi scored a stunning solo goal to kickstart his 2014 World Cup campaign.' }],
  '06-22': [{ year: 1986, event: 'Lineker Hat-trick', teams: 'England vs Poland', score: '3–0', detail: 'Gary Lineker scored all three goals to send England through to the last 16.' }],
  '07-09': [{ year: 2006, event: 'Italy Reach the Final', teams: 'Italy vs Germany', score: '2–0 AET', detail: 'Fabio Grosso scored in the 119th minute to send Italy to the final.' }],
  '06-20': [{ year: 1994, event: "Maradona's Last Dance", teams: 'Argentina vs Greece', score: '4–0', detail: 'Maradona ran directly at camera in celebration. He failed a drug test days later.' }],
  '07-01': [{ year: 2014, event: 'Algeria Shock Germany', teams: 'Algeria vs Germany', score: '2–1 AET', detail: 'Algeria pushed the eventual champions to extra time in a thrilling round of 16.' }],
  '06-12': [{ year: 2014, event: 'Brazil Open WC 2014', teams: 'Brazil vs Croatia', score: '3–1', detail: 'Neymar scored twice as Brazil opened on home soil in front of 62,000 fans.' }],
  '07-05': [{ year: 2014, event: 'Colombia vs Brazil', teams: 'Colombia vs Brazil', score: '1–2', detail: "James Rodríguez's golden boot campaign ended. Brazil's controversial win with Neymar's foul." }],
  '06-14': [{ year: 1998, event: "Zidane's Brace in Final", teams: 'France vs Brazil', score: '3–0', detail: 'Zidane scored twice in the first half as France won their first World Cup.' }],
  '07-12': [{ year: 1998, event: 'France Crowned Champions', teams: 'France vs Brazil', score: '3–0', detail: "Zidane's two headers and a late Petit goal gave France the trophy on home soil." }],
  '06-23': [{ year: 1994, event: "Baggio's Brilliance", teams: 'Italy vs Norway', score: '1–0', detail: 'Roberto Baggio scored a stunning solo goal to spare Italy\'s blushes.' }],
  '06-16': [{ year: 2010, event: "Green's Howler", teams: 'England vs USA', score: '1–1', detail: "Robert Green dropped Dempsey's tame shot to gift the USA a draw." }],
  '06-11': [{ year: 2010, event: 'World Cup Opens in Africa', teams: 'South Africa vs Mexico', score: '1–1', detail: 'First ever World Cup on African soil opened to the sound of thousands of vuvuzelas.' }],
  '06-26': [{ year: 2010, event: 'England vs Germany', teams: 'England vs Germany', score: '1–4', detail: "Frank Lampard's shot clearly crossed the line but the goal was not given." }],
  '07-02': [{ year: 2010, event: "Ghana's Heartbreak", teams: 'Uruguay vs Ghana', score: '1–1 (4–2 pens)', detail: 'Suárez handball on the line broke African hearts. Asamoah Gyan hit the post.' }],
  '06-27': [{ year: 2014, event: "Rodrigo's Wonder Strike", teams: 'Colombia vs Uruguay', score: '2–0', detail: 'James Rodríguez scored a stunning chest-and-volley in one of the great WC goals.' }],
  '07-07': [{ year: 2018, event: 'England vs Croatia', teams: 'England vs Croatia', score: '1–2 AET', detail: 'England were 90 minutes from the final before Mandzukic broke their hearts.' }],
  '07-10': [{ year: 2018, event: 'France vs Belgium', teams: 'France vs Belgium', score: '1–0', detail: "Umtiti's header sent France to the final as Belgium's golden generation fell short." }],
  '07-06': [{ year: 2018, event: "Russia's Fairytale Ends", teams: 'Russia vs Croatia', score: '2–2 (3–4 pens)', detail: 'Hosts Russia pushed Croatia all the way before losing a shootout in front of their fans.' }],
  '06-15': [{ year: 2018, event: "Ronaldo's Hat-trick", teams: 'Portugal vs Spain', score: '3–3', detail: 'Ronaldo scored a stunning free-kick in the 88th minute to complete his hat-trick.' }],
  '06-19': [{ year: 2018, event: "Germany's Shock Defeat", teams: 'Germany vs Mexico', score: '0–1', detail: 'Defending champions Germany lost their opener to Mexico in one of the great WC upsets.' }],
  '06-24': [{ year: 2018, event: 'South Korea Stun Germany', teams: 'South Korea vs Germany', score: '2–0', detail: 'Defending champions Germany were eliminated in the group stage for the first time since 1938.' }],
  '06-30': [{ year: 2018, event: 'Japan vs Belgium', teams: 'Japan vs Belgium', score: '2–3', detail: 'Belgium came from 2-0 down to win 3-2, with a 94th-minute counter-attack goal.' }],
  '07-03': [{ year: 2018, event: 'Brazil vs Belgium', teams: 'Brazil vs Belgium', score: '1–2', detail: "Belgium's Fernandinho own goal gave Brazil the lead but De Bruyne's strike won it." }],
  '06-18': [{ year: 2022, event: 'Argentina Shock', teams: 'Argentina vs Saudi Arabia', score: '1–2', detail: "Saudi Arabia produced one of the greatest upsets in World Cup history against Messi's Argentina." }],
  '07-18': [{ year: 1994, event: 'Baggio Misses the Penalty', teams: 'Brazil vs Italy', score: '0–0 (3–2 pens)', detail: 'Roberto Baggio fired the decisive penalty over the bar, handing Brazil the title.' }],
  '06-28': [{ year: 2022, event: 'Japan Stun Germany', teams: 'Japan vs Germany', score: '2–1', detail: 'Japan came from a goal down to shock Germany with two second-half goals.' }],
  '07-16': [{ year: 2022, event: "Messi's Dream Final", teams: 'Argentina vs France', score: '3–3 (4–2 pens)', detail: 'Messi finally lifted the World Cup in what many call the greatest final in history.' }],
  '06-10': [{ year: 2022, event: "Morocco's Opening Win", teams: 'Morocco vs Croatia', score: '0–0', detail: "Morocco opened their historic campaign, eventually becoming the first African team to reach the semis." }],
  '07-14': [{ year: 2022, event: "Morocco's Semifinal", teams: 'Morocco vs France', score: '0–2', detail: "Morocco's dream run ended against France but they made history as Africa's best ever WC team." }],
  '07-17': [{ year: 1966, event: 'Geoff Hurst Hat-trick', teams: 'England vs West Germany', score: '4–2 AET', detail: "Hurst's controversial second goal crossed the line. He completed his hat-trick in the final minutes." }],
  '07-19': [{ year: 1966, event: 'England Win the World Cup', teams: 'England vs West Germany', score: '4–2', detail: "England's only World Cup title. 'They think it's all over... it is now!'" }],
  '06-08': [{ year: 2002, event: "Ronaldo's Brace in Final", teams: 'Brazil vs Germany', score: '2–0', detail: "Ronaldo scored twice in the final to complete his redemption story from 1998." }],
  '05-31': [{ year: 2002, event: 'WC Opens in Asia', teams: 'Senegal vs France', score: '1–0', detail: "Senegal shocked defending champions France in the World Cup's first match in Asia." }],
  '06-05': [{ year: 2002, event: 'South Korea vs USA', teams: 'South Korea vs USA', score: '1–0', detail: "South Korea's fairytale run continued as they defeated the USA in front of a passionate home crowd." }],
  '06-07': [{ year: 2002, event: 'South Korea Top Group', teams: 'South Korea vs Portugal', score: '1–0', detail: 'South Korea topped their group in remarkable fashion, eliminating Portugal.' }],
  '06-09': [{ year: 2006, event: 'Germany 4–2 Costa Rica', teams: 'Germany vs Costa Rica', score: '4–2', detail: 'Germany opened the 2006 World Cup with a nine-goal thriller in Munich.' }],
  '06-03': [{ year: 1994, event: 'WC Comes to America', teams: 'USA vs Switzerland', score: '1–1', detail: 'The World Cup came to America for the first time, with the hosts drawing their opener.' }],
  '07-20': [{ year: 1994, event: "Brazil's Fourth Star", teams: 'Brazil vs Italy', score: '0–0 (3–2 pens)', detail: 'Brazil won their fourth World Cup in a penalty shootout, the first ever in a World Cup final.' }],
  '06-04': [{ year: 1998, event: 'Brazil 4–0 Scotland', teams: 'Brazil vs Scotland', score: '4–0', detail: "Scotland's World Cup nightmare continued as Brazil put four past them in Paris." }],
  '06-02': [{ year: 1958, event: "Pelé's World Cup Debut", teams: 'Brazil vs USSR', score: '2–0', detail: 'A 17-year-old Pelé made his World Cup debut, signaling the arrival of a legend.' }],
  '07-21': [{ year: 1930, event: 'First World Cup Final', teams: 'Uruguay vs Argentina', score: '4–2', detail: 'Uruguay won the first ever World Cup final in front of 93,000 fans in Montevideo.' }],
  '03-13': [{ year: 2026, event: 'Road to 2026', teams: '48 Nations Qualifying', detail: 'Teams across the world are battling for their place at the USA/Canada/Mexico 2026 World Cup.' }],
  '06-01': [{ year: 2006, event: 'World Cup Draw Day', teams: '32 Nations', detail: 'The 2006 World Cup draw was held in Leipzig, setting up one of the great tournaments.' }],
};

// Flat list of all entries for navigation
const ALL_ENTRIES: Array<{ key: string; entry: HistoryEntry }> = Object.entries(WC_HISTORY).flatMap(([key, entries]) =>
  entries.map((entry) => ({ key, entry }))
);

function getTodayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function formatDisplayDate(key: string): string {
  const [month, day] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}`;
}

const FALLBACK_ENTRY: HistoryEntry = {
  year: 2026,
  event: 'Road to World Cup 2026',
  teams: '48 Nations',
  detail: 'On this day, the World Cup world is gearing up for 2026. USA, Canada and Mexico will host the first ever 48-team World Cup.',
};

export default function TodayInHistory() {
  const todayKey = getTodayKey();
  const todayEntries = WC_HISTORY[todayKey];
  const initialEntry = todayEntries ? todayEntries[0] : FALLBACK_ENTRY;
  const initialIndex = todayEntries
    ? ALL_ENTRIES.findIndex((e) => e.key === todayKey)
    : ALL_ENTRIES.findIndex((e) => e.key === '03-13');

  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  const current = ALL_ENTRIES[currentIndex];
  const entry = current?.entry ?? initialEntry;
  const entryKey = current?.key ?? todayKey;

  function prev() {
    setCurrentIndex((i) => (i - 1 + ALL_ENTRIES.length) % ALL_ENTRIES.length);
  }

  function next() {
    setCurrentIndex((i) => (i + 1) % ALL_ENTRIES.length);
  }

  return (
    <div
      className="rounded-2xl p-6 sm:p-8"
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <span className="font-mono text-red-500 uppercase" style={{ fontSize: '11px', letterSpacing: '1.5px' }}>
            {'// TODAY IN WORLD CUP HISTORY'}
          </span>
          <div className="font-mono text-white/60 mt-1" style={{ fontSize: '11px' }}>
            {formatDisplayDate(entryKey)}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={prev}
            className="font-mono text-white/50 hover:text-white transition-colors px-3 py-1 rounded"
            style={{ fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}
          >
            ← Prev
          </button>
          <button
            onClick={next}
            className="font-mono text-white/50 hover:text-white transition-colors px-3 py-1 rounded"
            style={{ fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
        {/* Year badge */}
        <div
          className="flex-shrink-0 rounded-xl flex items-center justify-center"
          style={{
            width: '100px',
            height: '100px',
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.3)',
          }}
        >
          <span
            className="font-display font-semibold text-red-500"
            style={{ fontSize: '32px', lineHeight: 1 }}
          >
            {entry.year}
          </span>
        </div>

        {/* Center info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-sans font-bold text-white" style={{ fontSize: '22px', lineHeight: 1.2 }}>
            {entry.event}
          </h3>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="font-mono text-white/50" style={{ fontSize: '12px' }}>
              {entry.teams}
            </span>
            {entry.score && (
              <span
                className="font-display font-semibold text-white px-2 py-0.5 rounded"
                style={{ fontSize: '13px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {entry.score}
              </span>
            )}
          </div>
        </div>

        {/* Detail text */}
        <div className="flex-1 min-w-0 sm:max-w-xs">
          <p
            className="font-display text-white/60"
            style={{ fontSize: '14px', lineHeight: 1.6 }}
          >
            {entry.detail}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-6 flex items-center gap-2">
        <div className="flex-1 rounded-full overflow-hidden" style={{ height: '2px', background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / ALL_ENTRIES.length) * 100}%`,
              background: 'var(--red)',
            }}
          />
        </div>
        <span className="font-mono text-white/60" style={{ fontSize: '10px', flexShrink: 0 }}>
          {currentIndex + 1} / {ALL_ENTRIES.length}
        </span>
      </div>
    </div>
  );
}
