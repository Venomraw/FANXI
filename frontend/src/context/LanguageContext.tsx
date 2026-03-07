'use client';
import React, { createContext, useContext, useState } from 'react';

export type LangCode = 'EN' | 'ES' | 'FR' | 'PT' | 'DE';

const TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  EN: {
    // Nav
    hub:          'Hub',
    matches:      'Matches',
    intel:        'Intel',
    ai:           'AI',
    leaderboard:  'Leaderboard',
    guide:        'Guide',
    // Dropdown
    profile:      'Profile',
    settings:     'Settings',
    myPredictions:'My Predictions',
    language:     'Language',
    logout:       'Logout',
    // Hub hero
    heroTitle:    'Build Your\nWorld Cup XI',
    heroSub:      'Pick your tactical formation, place every player, lock your prediction.',
    // Onboarding / misc
    save:         'Save',
    cancel:       'Cancel',
  },
  ES: {
    hub:          'Hub',
    matches:      'Partidos',
    intel:        'Intel',
    ai:           'IA',
    leaderboard:  'Clasificación',
    guide:        'Guía',
    profile:      'Perfil',
    settings:     'Ajustes',
    myPredictions:'Mis Predicciones',
    language:     'Idioma',
    logout:       'Cerrar sesión',
    heroTitle:    'Construye Tu\nXI del Mundial',
    heroSub:      'Elige tu formación táctica, coloca a cada jugador, bloquea tu predicción.',
    save:         'Guardar',
    cancel:       'Cancelar',
  },
  FR: {
    hub:          'Hub',
    matches:      'Matchs',
    intel:        'Intel',
    ai:           'IA',
    leaderboard:  'Classement',
    guide:        'Guide',
    profile:      'Profil',
    settings:     'Paramètres',
    myPredictions:'Mes Pronostics',
    language:     'Langue',
    logout:       'Déconnexion',
    heroTitle:    'Construis Ton\nXI de la Coupe du Monde',
    heroSub:      'Choisis ta formation tactique, place chaque joueur, verrouille ta prédiction.',
    save:         'Enregistrer',
    cancel:       'Annuler',
  },
  PT: {
    hub:          'Hub',
    matches:      'Jogos',
    intel:        'Intel',
    ai:           'IA',
    leaderboard:  'Classificação',
    guide:        'Guia',
    profile:      'Perfil',
    settings:     'Configurações',
    myPredictions:'Minhas Previsões',
    language:     'Idioma',
    logout:       'Sair',
    heroTitle:    'Monte Seu\nXI da Copa',
    heroSub:      'Escolha sua formação tática, posicione cada jogador, bloqueie sua previsão.',
    save:         'Salvar',
    cancel:       'Cancelar',
  },
  DE: {
    hub:          'Hub',
    matches:      'Spiele',
    intel:        'Intel',
    ai:           'KI',
    leaderboard:  'Bestenliste',
    guide:        'Leitfaden',
    profile:      'Profil',
    settings:     'Einstellungen',
    myPredictions:'Meine Prognosen',
    language:     'Sprache',
    logout:       'Abmelden',
    heroTitle:    'Baue Dein\nWM-XI',
    heroSub:      'Wähle deine taktische Formation, platziere jeden Spieler, sperre deine Prognose.',
    save:         'Speichern',
    cancel:       'Abbrechen',
  },
};

interface LanguageContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'EN',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('fanxi_lang') as LangCode) ?? 'EN';
    }
    return 'EN';
  });

  function setLang(l: LangCode) {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('fanxi_lang', l);
  }

  function t(key: string): string {
    return TRANSLATIONS[lang][key] ?? TRANSLATIONS['EN'][key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
