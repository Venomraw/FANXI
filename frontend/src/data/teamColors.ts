export interface WCTeam {
  id: string;
  name: string;
  shortName: string;
  confederation: 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';
  flag: string;        // emoji flag
  primary: string;     // main kit color (hex)
  accent: string;      // secondary color (hex)
  text: string;        // text color on primary bg
}

export const WC2026_TEAMS: WCTeam[] = [
  // ── UEFA (16) ────────────────────────────────────────────────
  { id: 'germany',     name: 'Germany',     shortName: 'GER', confederation: 'UEFA',     flag: '🇩🇪', primary: '#1a1a1a', accent: '#FF0000', text: '#ffffff' },
  { id: 'france',      name: 'France',      shortName: 'FRA', confederation: 'UEFA',     flag: '🇫🇷', primary: '#002395', accent: '#ED2939', text: '#ffffff' },
  { id: 'spain',       name: 'Spain',       shortName: 'ESP', confederation: 'UEFA',     flag: '🇪🇸', primary: '#AA151B', accent: '#F1BF00', text: '#ffffff' },
  { id: 'england',     name: 'England',     shortName: 'ENG', confederation: 'UEFA',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', primary: '#CF081F', accent: '#ffffff', text: '#ffffff' },
  { id: 'portugal',    name: 'Portugal',    shortName: 'POR', confederation: 'UEFA',     flag: '🇵🇹', primary: '#006600', accent: '#FF0000', text: '#ffffff' },
  { id: 'netherlands', name: 'Netherlands', shortName: 'NED', confederation: 'UEFA',     flag: '🇳🇱', primary: '#FF6200', accent: '#003DA5', text: '#ffffff' },
  { id: 'belgium',     name: 'Belgium',     shortName: 'BEL', confederation: 'UEFA',     flag: '🇧🇪', primary: '#1a1a1a', accent: '#FDDA24', text: '#ffffff' },
  { id: 'italy',       name: 'Italy',       shortName: 'ITA', confederation: 'UEFA',     flag: '🇮🇹', primary: '#003087', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'croatia',     name: 'Croatia',     shortName: 'CRO', confederation: 'UEFA',     flag: '🇭🇷', primary: '#CC1C2F', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'switzerland', name: 'Switzerland', shortName: 'SUI', confederation: 'UEFA',     flag: '🇨🇭', primary: '#FF0000', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'denmark',     name: 'Denmark',     shortName: 'DEN', confederation: 'UEFA',     flag: '🇩🇰', primary: '#C60C30', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'austria',     name: 'Austria',     shortName: 'AUT', confederation: 'UEFA',     flag: '🇦🇹', primary: '#ED2939', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'serbia',      name: 'Serbia',      shortName: 'SRB', confederation: 'UEFA',     flag: '🇷🇸', primary: '#0C4076', accent: '#C6363C', text: '#ffffff' },
  { id: 'hungary',     name: 'Hungary',     shortName: 'HUN', confederation: 'UEFA',     flag: '🇭🇺', primary: '#CE2939', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'scotland',    name: 'Scotland',    shortName: 'SCO', confederation: 'UEFA',     flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', primary: '#003F87', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'turkey',      name: 'Türkiye',     shortName: 'TUR', confederation: 'UEFA',     flag: '🇹🇷', primary: '#E30A17', accent: '#FFFFFF', text: '#ffffff' },

  // ── CONMEBOL (6) ─────────────────────────────────────────────
  { id: 'brazil',      name: 'Brazil',      shortName: 'BRA', confederation: 'CONMEBOL', flag: '🇧🇷', primary: '#009C3B', accent: '#FFDF00', text: '#ffffff' },
  { id: 'argentina',   name: 'Argentina',   shortName: 'ARG', confederation: 'CONMEBOL', flag: '🇦🇷', primary: '#74ACDF', accent: '#FFFFFF', text: '#1a1a1a' },
  { id: 'uruguay',     name: 'Uruguay',     shortName: 'URU', confederation: 'CONMEBOL', flag: '🇺🇾', primary: '#5EB6E4', accent: '#FFFFFF', text: '#1a1a1a' },
  { id: 'colombia',    name: 'Colombia',    shortName: 'COL', confederation: 'CONMEBOL', flag: '🇨🇴', primary: '#FCD116', accent: '#003087', text: '#1a1a1a' },
  { id: 'ecuador',     name: 'Ecuador',     shortName: 'ECU', confederation: 'CONMEBOL', flag: '🇪🇨', primary: '#FFD100', accent: '#003087', text: '#1a1a1a' },
  { id: 'venezuela',   name: 'Venezuela',   shortName: 'VEN', confederation: 'CONMEBOL', flag: '🇻🇪', primary: '#CF0921', accent: '#003087', text: '#ffffff' },

  // ── CONCACAF (6) ─────────────────────────────────────────────
  { id: 'usa',         name: 'USA',         shortName: 'USA', confederation: 'CONCACAF', flag: '🇺🇸', primary: '#3C3B6E', accent: '#B22234', text: '#ffffff' },
  { id: 'mexico',      name: 'Mexico',      shortName: 'MEX', confederation: 'CONCACAF', flag: '🇲🇽', primary: '#006847', accent: '#CE1126', text: '#ffffff' },
  { id: 'canada',      name: 'Canada',      shortName: 'CAN', confederation: 'CONCACAF', flag: '🇨🇦', primary: '#FF0000', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'panama',      name: 'Panama',      shortName: 'PAN', confederation: 'CONCACAF', flag: '🇵🇦', primary: '#DA121A', accent: '#003DA5', text: '#ffffff' },
  { id: 'costarica',   name: 'Costa Rica',  shortName: 'CRC', confederation: 'CONCACAF', flag: '🇨🇷', primary: '#002B7F', accent: '#CE1126', text: '#ffffff' },
  { id: 'honduras',    name: 'Honduras',    shortName: 'HON', confederation: 'CONCACAF', flag: '🇭🇳', primary: '#0073CF', accent: '#FFFFFF', text: '#ffffff' },

  // ── CAF (9) ──────────────────────────────────────────────────
  { id: 'morocco',     name: 'Morocco',     shortName: 'MAR', confederation: 'CAF',      flag: '🇲🇦', primary: '#C1272D', accent: '#006233', text: '#ffffff' },
  { id: 'nigeria',     name: 'Nigeria',     shortName: 'NGA', confederation: 'CAF',      flag: '🇳🇬', primary: '#008751', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'senegal',     name: 'Senegal',     shortName: 'SEN', confederation: 'CAF',      flag: '🇸🇳', primary: '#00853F', accent: '#FDEF42', text: '#ffffff' },
  { id: 'egypt',       name: 'Egypt',       shortName: 'EGY', confederation: 'CAF',      flag: '🇪🇬', primary: '#CE1126', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'cameroon',    name: 'Cameroon',    shortName: 'CMR', confederation: 'CAF',      flag: '🇨🇲', primary: '#007A5E', accent: '#FCD116', text: '#ffffff' },
  { id: 'ghana',       name: 'Ghana',       shortName: 'GHA', confederation: 'CAF',      flag: '🇬🇭', primary: '#006B3F', accent: '#FCD116', text: '#ffffff' },
  { id: 'southafrica', name: 'South Africa',shortName: 'RSA', confederation: 'CAF',      flag: '🇿🇦', primary: '#007A4D', accent: '#FFB81C', text: '#ffffff' },
  { id: 'mali',        name: 'Mali',        shortName: 'MLI', confederation: 'CAF',      flag: '🇲🇱', primary: '#14B53A', accent: '#FCD116', text: '#ffffff' },
  { id: 'drcongo',     name: 'DR Congo',    shortName: 'COD', confederation: 'CAF',      flag: '🇨🇩', primary: '#007FFF', accent: '#F7D618', text: '#ffffff' },

  // ── AFC (8) ──────────────────────────────────────────────────
  { id: 'japan',       name: 'Japan',       shortName: 'JPN', confederation: 'AFC',      flag: '🇯🇵', primary: '#003087', accent: '#BC002D', text: '#ffffff' },
  { id: 'southkorea',  name: 'South Korea', shortName: 'KOR', confederation: 'AFC',      flag: '🇰🇷', primary: '#CD2E3A', accent: '#003087', text: '#ffffff' },
  { id: 'saudiarabia', name: 'Saudi Arabia',shortName: 'KSA', confederation: 'AFC',      flag: '🇸🇦', primary: '#006C35', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'australia',   name: 'Australia',   shortName: 'AUS', confederation: 'AFC',      flag: '🇦🇺', primary: '#00843D', accent: '#FFD700', text: '#ffffff' },
  { id: 'iran',        name: 'Iran',        shortName: 'IRN', confederation: 'AFC',      flag: '🇮🇷', primary: '#239F40', accent: '#DA0000', text: '#ffffff' },
  { id: 'qatar',       name: 'Qatar',       shortName: 'QAT', confederation: 'AFC',      flag: '🇶🇦', primary: '#8D1B3D', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'uzbekistan',  name: 'Uzbekistan',  shortName: 'UZB', confederation: 'AFC',      flag: '🇺🇿', primary: '#1EB53A', accent: '#003DA5', text: '#ffffff' },
  { id: 'jordan',      name: 'Jordan',      shortName: 'JOR', confederation: 'AFC',      flag: '🇯🇴', primary: '#007A3D', accent: '#CE1126', text: '#ffffff' },

  // ── OFC (1) ──────────────────────────────────────────────────
  { id: 'newzealand',  name: 'New Zealand', shortName: 'NZL', confederation: 'OFC',      flag: '🇳🇿', primary: '#00247D', accent: '#CC142B', text: '#ffffff' },

  // ── Intercontinental playoff spots (2) ───────────────────────
  { id: 'indonesia',   name: 'Indonesia',   shortName: 'IDN', confederation: 'AFC',      flag: '🇮🇩', primary: '#CE1126', accent: '#FFFFFF', text: '#ffffff' },
  { id: 'iraq',        name: 'Iraq',        shortName: 'IRQ', confederation: 'AFC',      flag: '🇮🇶', primary: '#007A3D', accent: '#CE1126', text: '#ffffff' },
];

export const DEFAULT_THEME = {
  primary: '#16a34a',
  accent: '#22c55e',
  text: '#ffffff',
};

export function getTeamById(id: string): WCTeam | undefined {
  return WC2026_TEAMS.find(t => t.id === id);
}
