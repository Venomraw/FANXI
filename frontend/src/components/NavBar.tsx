'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage, LangCode } from '@/src/context/LanguageContext';

const LANGUAGES: LangCode[] = ['EN', 'ES', 'FR', 'PT', 'DE'];

const NAV_LINKS = [
  { label: 'Hub',         href: '/'            },
  { label: 'Matches',     href: '/matches'     },
  { label: 'Intel',       href: '/nation'      },
  { label: 'AI',          href: '/ai'          },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Guide',       href: '/guide'       },
];

interface NavBarProps {
  subtitle?: string;
}

export default function NavBar({ subtitle }: NavBarProps) {
  const { primary, team, setShowPicker } = useTheme();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLang(l: LangCode) {
    setLang(l);
  }

  function handleLogout() {
    setDropdownOpen(false);
    logout();
    router.push('/login');
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <nav
        className="sticky top-0 z-50 w-full theme-transition"
        style={{
          background: 'rgba(6, 10, 6, 0.97)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
        }}
      >
        {/* Team-primary top accent line */}
        <div
          className="h-[4px] w-full theme-transition"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${primary} 25%, ${primary} 75%, transparent 100%)`,
          }}
        />

        <div
          className="max-w-[1400px] mx-auto px-7 flex items-center justify-between"
          style={{ height: '100px' }}
        >
          {/* ── Logo ── */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 flex-shrink-0"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <span
              className="font-display font-semibold leading-none theme-transition"
              style={{ fontSize: '52px', color: primary, letterSpacing: '-2px', lineHeight: 1 }}
            >
              Fan<span style={{ color: 'var(--gold)' }}>XI</span>
            </span>
            {subtitle && (
              <span
                className="font-mono hidden sm:inline-block"
                style={{
                  fontSize: '9px',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  color: primary,
                  border: `1px solid color-mix(in srgb, ${primary} 30%, transparent)`,
                  background: `color-mix(in srgb, ${primary} 8%, transparent)`,
                  padding: '2px 8px',
                  marginTop: '6px',
                }}
              >
                /{subtitle}
              </span>
            )}
          </button>

          {/* ── Nav links (desktop) ── */}
          <ul className="hidden lg:flex items-center list-none h-full" style={{ gap: '2px' }}>
            {NAV_LINKS.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <li key={label} className="relative h-full flex items-center">
                  <a
                    href={href}
                    className="relative flex items-center h-full font-sans font-semibold transition-all duration-200"
                    style={{
                      fontSize: '12px',
                      color: active ? 'var(--text)' : 'var(--muted)',
                      padding: '0 20px',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={e => {
                      if (!active) e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={e => {
                      if (!active) e.currentTarget.style.color = 'var(--muted)';
                    }}
                  >
                    {label}
                    {/* Active bottom bar */}
                    <span
                      className="absolute bottom-0 left-0 right-0 theme-transition"
                      style={{
                        height: '3px',
                        background: active ? primary : 'transparent',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  </a>
                </li>
              );
            })}
          </ul>

          {/* ── Right side ── */}
          <div className="flex items-center gap-4">

            {/* Team selector — clean, no border box */}
            {team && (
              <button
                onClick={() => setShowPicker(true)}
                className="hidden sm:flex items-center gap-2 transition-all duration-200 group"
                style={{ background: 'none', border: 'none', padding: '6px 10px' }}
              >
                <span className="text-xl leading-none">{team.flag}</span>
                <span
                  className="font-sans font-semibold hidden md:inline theme-transition"
                  style={{ fontSize: '14px', color: 'var(--muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = primary)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  {team.shortName}
                </span>
                <svg
                  width="10" height="6" viewBox="0 0 10 6" fill="none"
                  style={{ color: 'var(--muted)', flexShrink: 0 }}
                >
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            {/* Divider */}
            {user && (
              <div className="hidden sm:block h-6 w-px" style={{ background: 'var(--border)' }} />
            )}

            {/* User dropdown */}
            {user && (
              <div ref={dropdownRef} className="relative">
                {/* Trigger */}
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-2.5 transition-all duration-200"
                  style={{ background: 'none', border: 'none', padding: '6px 4px' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold flex-shrink-0 theme-transition"
                    style={{
                      background: `color-mix(in srgb, ${primary} 22%, transparent)`,
                      color: primary,
                      border: `1.5px solid color-mix(in srgb, ${primary} 45%, transparent)`,
                      fontSize: '15px',
                    }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                  {/* Name + rank */}
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-sans font-semibold leading-tight" style={{ fontSize: '13px', color: 'var(--text)' }}>
                      {user.display_name || user.username}
                    </span>
                    <span className="font-mono uppercase leading-tight theme-transition" style={{ fontSize: '9px', letterSpacing: '1.2px', color: primary }}>
                      {user.rank_title} · {user.football_iq_points}pts
                    </span>
                  </div>
                  {/* Chevron */}
                  <svg
                    width="10" height="6" viewBox="0 0 10 6" fill="none"
                    className="hidden sm:block transition-transform duration-200"
                    style={{ color: 'var(--muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}
                  >
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Dropdown panel */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 py-1 z-[200]"
                    style={{
                      background: 'rgba(6,10,6,0.97)',
                      backdropFilter: 'blur(32px)',
                      WebkitBackdropFilter: 'blur(32px)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                    }}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="font-sans font-semibold text-[13px]" style={{ color: 'var(--text)' }}>
                        {user.display_name || user.username}
                      </p>
                      <p className="font-mono text-[9px] tracking-widest uppercase mt-0.5" style={{ color: primary }}>
                        {user.rank_title} · {user.football_iq_points} pts
                      </p>
                    </div>

                    {/* Menu items */}
                    {[
                      { icon: '👤', label: t('profile'),       action: () => { router.push('/profile'); setDropdownOpen(false); } },
                      { icon: '⚙️', label: t('settings'),      action: () => { router.push('/settings'); setDropdownOpen(false); } },
                      { icon: '🏆', label: t('myPredictions'), action: () => { router.push('/?tab=history'); setDropdownOpen(false); } },
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

                    {/* Language switcher */}
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

                    {/* Separator + logout */}
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
                style={{
                  width: '22px',
                  background: 'var(--text)',
                  opacity: mobileOpen ? 0 : 1,
                }}
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

        {/* Bottom border */}
        <div className="h-px w-full" style={{ background: 'var(--border)' }} />

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div
            className="lg:hidden"
            style={{ background: 'rgba(6,10,6,0.99)', borderTop: '1px solid var(--border)' }}
          >
            <div className="max-w-[1400px] mx-auto px-7 py-6 flex flex-col gap-1">
              {NAV_LINKS.map(({ label, href }) => {
                const active = isActive(href);
                return (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center px-4 py-3.5 font-sans font-semibold transition-all border-l-[3px]"
                    style={{
                      fontSize: '16px',
                      color: active ? 'var(--text)' : 'var(--muted)',
                      borderLeftColor: active ? primary : 'transparent',
                      background: active
                        ? `color-mix(in srgb, ${primary} 6%, transparent)`
                        : 'transparent',
                    }}
                  >
                    {label}
                  </a>
                );
              })}

              {/* Mobile team selector */}
              {team && (
                <button
                  onClick={() => { setShowPicker(true); setMobileOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3.5 font-sans font-semibold w-full text-left transition-all mt-2"
                  style={{
                    fontSize: '16px',
                    color: primary,
                    background: 'none',
                    border: 'none',
                    borderTop: `1px solid var(--border)`,
                    paddingTop: '16px',
                  }}
                >
                  <span className="text-xl">{team.flag}</span>
                  <span>{team.name}</span>
                  <span className="font-mono text-[10px] opacity-50 ml-auto tracking-wider">Change</span>
                </button>
              )}

              {/* Mobile user menu */}
              {user && (
                <div className="border-t mt-2 pt-2 flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
                  {[
                    { icon: '👤', label: 'Profile',        href: '/profile'       },
                    { icon: '⚙️', label: 'Settings',       href: '/settings'      },
                    { icon: '🏆', label: 'My Predictions', href: '/?tab=history'  },
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

                  {/* Mobile language */}
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
    </>
  );
}
