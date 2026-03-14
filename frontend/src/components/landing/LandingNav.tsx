'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage, LangCode } from '@/src/context/LanguageContext';

const LANGUAGES: LangCode[] = ['EN', 'ES', 'FR', 'PT', 'DE'];

const NAV_LINKS = [
  { label: 'Matches',     href: '/matches' },
  { label: 'Predict',     href: '/predict', highlight: true },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Nations',     href: '/nation' },
  { label: 'AI Lab',      href: '/ai' },
  { label: 'Guide',       href: '/guide' },
];

export default function LandingNav() {
  const { primary, team, setShowPicker } = useTheme();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 60);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLang(l: LangCode) { setLang(l); }

  function handleLogout() {
    setDropdownOpen(false);
    logout();
    router.push('/login');
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  // Auth users get Hub link added
  const links = user
    ? [{ label: 'Hub', href: '/hub' }, ...NAV_LINKS]
    : NAV_LINKS;

  return (
    <nav
      className="fixed top-[40px] left-0 right-0 z-40 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(6, 10, 6, 0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(32px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(32px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        boxShadow: scrolled ? '0 10px 40px rgba(0,0,0,0.35)' : 'none',
      }}
    >
      <div
        className="max-w-[1400px] mx-auto px-7 flex items-center justify-between"
        style={{ height: '72px' }}
      >
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 flex-shrink-0"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <span
            className="font-display font-semibold leading-none"
            style={{ fontSize: '32px', color: primary, letterSpacing: '-1px', lineHeight: 1 }}
          >
            Fan<span style={{ color: 'var(--gold)' }}>XI</span>
          </span>
        </button>

        {/* Nav links (desktop) */}
        <ul className="hidden lg:flex items-center list-none h-full" style={{ gap: '2px' }}>
          {links.map(({ label, href, highlight }) => {
            const active = isActive(href);
            if (highlight) {
              return (
                <li key={label} className="relative h-full flex items-center px-1">
                  <a
                    href={href}
                    className="flex items-center font-sans font-bold rounded-lg transition-all duration-200"
                    style={{
                      fontSize: '12px',
                      color: '#fff',
                      background: '#dc2626',
                      padding: '7px 16px',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#dc2626'; }}
                  >
                    ⚽ {label}
                  </a>
                </li>
              );
            }
            return (
              <li key={label} className="relative h-full flex items-center">
                <a
                  href={href}
                  className="relative flex items-center h-full font-sans font-semibold transition-all duration-200"
                  style={{
                    fontSize: '12px',
                    color: active ? 'var(--text)' : 'var(--muted)',
                    padding: '0 18px',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  {label}
                  <span
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: '2px',
                      background: active ? primary : 'transparent',
                      transition: 'background 0.3s ease',
                    }}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Guest buttons */}
          {!user && (
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => router.push('/login')}
                className="font-sans font-semibold transition-all duration-200"
                style={{
                  fontSize: '13px',
                  color: 'var(--muted)',
                  background: 'none',
                  border: 'none',
                  padding: '8px 14px',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/login')}
                className="font-sans font-bold rounded-lg transition-all duration-200"
                style={{
                  fontSize: '13px',
                  color: '#fff',
                  background: 'var(--red)',
                  border: 'none',
                  padding: '9px 20px',
                  boxShadow: '0 0 16px rgba(255,45,85,0.3)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ff4d6d';
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(255,45,85,0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--red)';
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(255,45,85,0.3)';
                }}
              >
                Join Free →
              </button>
            </div>
          )}

          {/* Team selector */}
          {team && user && (
            <button
              onClick={() => setShowPicker(true)}
              className="hidden sm:flex items-center gap-2 transition-all duration-200"
              style={{ background: 'none', border: 'none', padding: '6px 10px' }}
            >
              <span className="text-xl leading-none">{team.flag}</span>
              <span
                className="font-sans font-semibold hidden md:inline"
                style={{ fontSize: '13px', color: 'var(--muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = primary)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              >
                {team.shortName}
              </span>
            </button>
          )}

          {/* Divider */}
          {user && (
            <div className="hidden sm:block h-5 w-px" style={{ background: 'var(--border)' }} />
          )}

          {/* User dropdown */}
          {user && (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2.5 transition-all duration-200"
                style={{ background: 'none', border: 'none', padding: '6px 4px' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-display font-semibold flex-shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${primary} 22%, transparent)`,
                    color: primary,
                    border: `1.5px solid color-mix(in srgb, ${primary} 45%, transparent)`,
                    fontSize: '14px',
                  }}
                >
                  {user.username[0].toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="font-sans font-semibold leading-tight" style={{ fontSize: '13px', color: 'var(--text)' }}>
                    {user.display_name || user.username}
                  </span>
                  <span className="font-mono uppercase leading-tight" style={{ fontSize: '9px', letterSpacing: '1.2px', color: primary }}>
                    {user.rank_title} · {user.football_iq_points}pts
                  </span>
                </div>
                <svg
                  width="10" height="6" viewBox="0 0 10 6" fill="none"
                  className="hidden sm:block transition-transform duration-200"
                  style={{ color: 'var(--muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
                >
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 py-1 z-[200] rounded-lg"
                  style={{
                    background: 'rgba(6,10,6,0.97)',
                    backdropFilter: 'blur(32px)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <p className="font-sans font-semibold text-[13px]" style={{ color: 'var(--text)' }}>
                      {user.display_name || user.username}
                    </p>
                    <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5" style={{ color: primary }}>
                      {user.rank_title} · {user.football_iq_points} pts
                    </p>
                  </div>

                  {[
                    { icon: '👤', label: t('profile'),       action: () => { router.push('/profile'); setDropdownOpen(false); } },
                    { icon: '⚙️', label: t('settings'),      action: () => { router.push('/settings'); setDropdownOpen(false); } },
                    { icon: '🏆', label: t('myPredictions'), action: () => { router.push('/predict?tab=history'); setDropdownOpen(false); } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 px-4 py-2.5 font-sans font-semibold text-[13px] text-left transition-colors"
                      style={{ color: 'var(--muted)', background: 'none', border: 'none' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--text)';
                        e.currentTarget.style.background = `color-mix(in srgb, ${primary} 6%, transparent)`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--muted)';
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}

                  <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🌍</span>
                      <span className="font-sans font-semibold text-[13px]" style={{ color: 'var(--muted)' }}>{t('language')}</span>
                    </div>
                    <div className="flex gap-1">
                      {LANGUAGES.map(l => (
                        <button
                          key={l}
                          onClick={() => handleLang(l)}
                          className="flex-1 py-1 font-mono text-[9px] tracking-wider transition-all"
                          style={{
                            background: lang === l ? primary : 'transparent',
                            color: lang === l ? 'var(--dark)' : 'var(--muted)',
                            border: `1px solid ${lang === l ? primary : 'var(--border)'}`,
                            fontWeight: lang === l ? 700 : 400,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t mt-1" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 font-sans font-semibold text-[13px] text-left transition-colors"
                      style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#FF2D55';
                        e.currentTarget.style.background = 'rgba(255,45,85,0.06)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      <span className="text-base w-5 text-center">⏻</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex flex-col justify-center items-center gap-[5px] w-10 h-10 transition-all"
            style={{ background: 'none', border: 'none' }}
            aria-label="Toggle menu"
          >
            <span
              className="block h-[1.5px] transition-all duration-300 origin-center"
              style={{
                width: '22px',
                background: mobileOpen ? primary : 'var(--text)',
                transform: mobileOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none',
              }}
            />
            <span
              className="block h-[1.5px] transition-all duration-300"
              style={{ width: '22px', background: 'var(--text)', opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block h-[1.5px] transition-all duration-300 origin-center"
              style={{
                width: '22px',
                background: mobileOpen ? primary : 'var(--text)',
                transform: mobileOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="lg:hidden"
          style={{ background: 'rgba(6,10,6,0.99)', borderTop: '1px solid var(--border)' }}
        >
          <div className="max-w-[1400px] mx-auto px-7 py-6 flex flex-col gap-1">
            {links.map(({ label, href, highlight }) => {
              const active = isActive(href);
              return (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3.5 font-sans font-semibold transition-all border-l-[3px]"
                  style={{
                    fontSize: '16px',
                    color: highlight ? '#dc2626' : active ? 'var(--text)' : 'var(--muted)',
                    borderLeftColor: active ? primary : 'transparent',
                    background: active ? `color-mix(in srgb, ${primary} 6%, transparent)` : 'transparent',
                  }}
                >
                  {highlight && '⚽ '}{label}
                </a>
              );
            })}

            {!user && (
              <div className="flex flex-col gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => { router.push('/login'); setMobileOpen(false); }}
                  className="w-full py-3 font-sans font-semibold text-[15px] rounded-lg transition-all"
                  style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                >
                  Join Free →
                </button>
                <button
                  onClick={() => { router.push('/login'); setMobileOpen(false); }}
                  className="w-full py-3 font-sans font-semibold text-[15px] rounded-lg transition-all"
                  style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  Sign In
                </button>
              </div>
            )}

            {team && user && (
              <button
                onClick={() => { setShowPicker(true); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3.5 font-sans font-semibold w-full text-left transition-all mt-2"
                style={{
                  fontSize: '16px',
                  color: primary,
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '16px',
                }}
              >
                <span className="text-xl">{team.flag}</span>
                <span>{team.name}</span>
                <span className="font-mono text-[10px] opacity-50 ml-auto tracking-wider">Change</span>
              </button>
            )}

            {user && (
              <div className="border-t mt-2 pt-2 flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
                {[
                  { icon: '👤', label: 'Profile',        href: '/profile' },
                  { icon: '⚙️', label: 'Settings',       href: '/settings' },
                  { icon: '🏆', label: 'My Predictions', href: '/predict?tab=history' },
                ].map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 font-sans font-semibold"
                    style={{ fontSize: '15px', color: 'var(--muted)' }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </a>
                ))}

                <div className="px-4 py-3">
                  <p className="font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>🌍 Language</p>
                  <div className="flex gap-1">
                    {LANGUAGES.map(l => (
                      <button
                        key={l}
                        onClick={() => handleLang(l)}
                        className="flex-1 py-1.5 font-mono text-[10px] tracking-wider transition-all"
                        style={{
                          background: lang === l ? primary : 'transparent',
                          color: lang === l ? 'var(--dark)' : 'var(--muted)',
                          border: `1px solid ${lang === l ? primary : 'var(--border)'}`,
                          fontWeight: lang === l ? 700 : 400,
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 font-sans font-semibold text-left w-full"
                  style={{ fontSize: '15px', color: 'rgba(255,45,85,0.7)', background: 'none', border: 'none' }}
                >
                  <span>⏻</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
