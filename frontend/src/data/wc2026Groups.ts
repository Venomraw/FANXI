import { WC2026_TEAMS, type WCTeam } from './teamColors';

export interface GroupDef {
  teams: string[];
  venue: string;
}

// Official FIFA World Cup 2026 Group Draw — December 5, 2025, Washington D.C.
export const WC2026_GROUPS: Record<string, GroupDef> = {
  A: { teams: ['Mexico', 'South Korea', 'South Africa', 'Czechia'], venue: 'Various' },
  B: { teams: ['Canada', 'Switzerland', 'Qatar', 'Bosnia and Herzegovina'], venue: 'Various' },
  C: { teams: ['Brazil', 'Morocco', 'Scotland', 'Haiti'], venue: 'Various' },
  D: { teams: ['USA', 'Paraguay', 'Australia', 'Türkiye'], venue: 'Various' },
  E: { teams: ['Germany', 'Ivory Coast', 'Ecuador', 'Curaçao'], venue: 'Various' },
  F: { teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'], venue: 'Various' },
  G: { teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'], venue: 'Various' },
  H: { teams: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'], venue: 'Various' },
  I: { teams: ['France', 'Senegal', 'Iraq', 'Norway'], venue: 'Various' },
  J: { teams: ['Argentina', 'Algeria', 'Austria', 'Jordan'], venue: 'Various' },
  K: { teams: ['Portugal', 'Colombia', 'Uzbekistan', 'DR Congo'], venue: 'Various' },
  L: { teams: ['England', 'Croatia', 'Panama', 'Ghana'], venue: 'Various' },
};

export const GROUP_KEYS = Object.keys(WC2026_GROUPS) as string[];

// Team lookup helpers — find WCTeam by name (fuzzy: handles minor mismatches)
const teamByName = new Map<string, WCTeam>();
for (const t of WC2026_TEAMS) {
  teamByName.set(t.name, t);
  teamByName.set(t.shortName, t);
}
// Aliases for qualified teams not in the base WC2026_TEAMS array in teamColors.ts
const ALIASES: Record<string, Partial<WCTeam>> = {
  // UEFA new qualifiers
  'Czechia':                    { name: 'Czechia',                    shortName: 'CZE', flag: '\u{1F1E8}\u{1F1FF}', primary: '#D7141A', accent: '#11457E', text: '#ffffff' },
  'Bosnia and Herzegovina':     { name: 'Bosnia and Herzegovina',     shortName: 'BIH', flag: '\u{1F1E7}\u{1F1E6}', primary: '#002395', accent: '#FFD23F', text: '#ffffff' },
  'Norway':                     { name: 'Norway',                     shortName: 'NOR', flag: '\u{1F1F3}\u{1F1F4}', primary: '#BA0C2F', accent: '#00205B', text: '#ffffff' },
  'Sweden':                     { name: 'Sweden',                     shortName: 'SWE', flag: '\u{1F1F8}\u{1F1EA}', primary: '#006AA7', accent: '#FECC02', text: '#ffffff' },
  // CAF
  'Algeria':                    { name: 'Algeria',                    shortName: 'ALG', flag: '\u{1F1E9}\u{1F1FF}', primary: '#006233', accent: '#FFFFFF', text: '#ffffff' },
  'Ivory Coast':                { name: 'Ivory Coast',                shortName: 'CIV', flag: '\u{1F1E8}\u{1F1EE}', primary: '#F77F00', accent: '#009E60', text: '#ffffff' },
  'Cape Verde':                 { name: 'Cape Verde',                 shortName: 'CPV', flag: '\u{1F1E8}\u{1F1FB}', primary: '#003893', accent: '#CF2028', text: '#ffffff' },
  'Tunisia':                    { name: 'Tunisia',                    shortName: 'TUN', flag: '\u{1F1F9}\u{1F1F3}', primary: '#E70013', accent: '#FFFFFF', text: '#ffffff' },
  // CONMEBOL
  'Paraguay':                   { name: 'Paraguay',                   shortName: 'PAR', flag: '\u{1F1F5}\u{1F1FE}', primary: '#DA121A', accent: '#0038A8', text: '#ffffff' },
  // CONCACAF
  'Haiti':                      { name: 'Haiti',                      shortName: 'HAI', flag: '\u{1F1ED}\u{1F1F9}', primary: '#00209F', accent: '#D21034', text: '#ffffff' },
  'Curaçao':                    { name: 'Curaçao',                    shortName: 'CUW', flag: '\u{1F1E8}\u{1F1FC}', primary: '#002B7F', accent: '#FFD23F', text: '#ffffff' },
  // AFC
  'Iraq':                       { name: 'Iraq',                       shortName: 'IRQ', flag: '\u{1F1EE}\u{1F1F6}', primary: '#007A3D', accent: '#CE1126', text: '#ffffff' },
};

export interface TeamInfo {
  name: string;
  shortName: string;
  flag: string;
  primary: string;
  accent: string;
  text: string;
}

export function getTeamInfo(name: string): TeamInfo {
  const found = teamByName.get(name);
  if (found) {
    return {
      name: found.name,
      shortName: found.shortName,
      flag: found.flag,
      primary: found.primary,
      accent: found.accent,
      text: found.text,
    };
  }
  const alias = ALIASES[name];
  if (alias) {
    return {
      name: alias.name ?? name,
      shortName: alias.shortName ?? name.slice(0, 3).toUpperCase(),
      flag: alias.flag ?? '',
      primary: alias.primary ?? '#444',
      accent: alias.accent ?? '#888',
      text: alias.text ?? '#fff',
    };
  }
  return {
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    flag: '',
    primary: '#444',
    accent: '#888',
    text: '#fff',
  };
}

// ---------------------------------------------------------------------------
// R32 bracket seeding
// After group stage: 24 group qualifiers (1st + 2nd from 12 groups)
//                  + 8 best 3rd-place teams = 32 total
//
// R32 match slots based on FIFA 48-team format:
// Match 1:  1A vs 3(best)    Match 9:  1G vs 3(best)
// Match 2:  2B vs 2C         Match 10: 2H vs 2I
// Match 3:  1B vs 3(best)    Match 11: 1H vs 3(best)
// Match 4:  2A vs 2D         Match 12: 2G vs 2J
// Match 5:  1C vs 3(best)    Match 13: 1I vs 3(best)
// Match 6:  2E vs 2F         Match 14: 2K vs 2L
// Match 7:  1D vs 3(best)    Match 15: 1J vs 3(best)
// Match 8:  1E vs 1F         Match 16: 1K vs 1L
// ---------------------------------------------------------------------------

export interface R32Slot {
  id: string;
  label: string;
  sourceA: { type: 'group'; group: string; position: '1st' | '2nd' } | { type: '3rd' };
  sourceB: { type: 'group'; group: string; position: '1st' | '2nd' } | { type: '3rd' };
}

type GSource = { type: 'group'; group: string; position: '1st' | '2nd' };
type TSource = { type: '3rd' };
function g(group: string, position: '1st' | '2nd'): GSource { return { type: 'group', group, position }; }
function t(): TSource { return { type: '3rd' }; }

export const R32_BRACKET: R32Slot[] = [
  { id: 'r32_1',  label: 'M1',  sourceA: g('A','1st'), sourceB: t() },
  { id: 'r32_2',  label: 'M2',  sourceA: g('B','2nd'), sourceB: g('C','2nd') },
  { id: 'r32_3',  label: 'M3',  sourceA: g('B','1st'), sourceB: t() },
  { id: 'r32_4',  label: 'M4',  sourceA: g('A','2nd'), sourceB: g('D','2nd') },
  { id: 'r32_5',  label: 'M5',  sourceA: g('C','1st'), sourceB: t() },
  { id: 'r32_6',  label: 'M6',  sourceA: g('E','2nd'), sourceB: g('F','2nd') },
  { id: 'r32_7',  label: 'M7',  sourceA: g('D','1st'), sourceB: t() },
  { id: 'r32_8',  label: 'M8',  sourceA: g('E','1st'), sourceB: g('F','1st') },
  { id: 'r32_9',  label: 'M9',  sourceA: g('G','1st'), sourceB: t() },
  { id: 'r32_10', label: 'M10', sourceA: g('H','2nd'), sourceB: g('I','2nd') },
  { id: 'r32_11', label: 'M11', sourceA: g('H','1st'), sourceB: t() },
  { id: 'r32_12', label: 'M12', sourceA: g('G','2nd'), sourceB: g('J','2nd') },
  { id: 'r32_13', label: 'M13', sourceA: g('I','1st'), sourceB: t() },
  { id: 'r32_14', label: 'M14', sourceA: g('K','2nd'), sourceB: g('L','2nd') },
  { id: 'r32_15', label: 'M15', sourceA: g('J','1st'), sourceB: t() },
  { id: 'r32_16', label: 'M16', sourceA: g('K','1st'), sourceB: g('L','1st') },
];
