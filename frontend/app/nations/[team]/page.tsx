'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import NavBar from '@/src/components/NavBar';

// ── Constants ───────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const POS_COLORS: Record<string, string> = {
  GK: 'var(--gold)',
  RB: 'var(--blue)', LB: 'var(--blue)', CB: 'var(--blue)',
  CDM: 'var(--success)', CM: 'var(--success)', CAM: 'var(--success)',
  RW: '#FF6B6B', LW: '#FF6B6B', ST: '#FF6B6B',
};

const TEAM_FLAGS: Record<string, string> = {
  'Argentina': '\u{1F1E6}\u{1F1F7}', 'Australia': '\u{1F1E6}\u{1F1FA}',
  'Belgium': '\u{1F1E7}\u{1F1EA}', 'Bolivia': '\u{1F1E7}\u{1F1F4}',
  'Brazil': '\u{1F1E7}\u{1F1F7}', 'Cameroon': '\u{1F1E8}\u{1F1F2}',
  'Canada': '\u{1F1E8}\u{1F1E6}', 'Chile': '\u{1F1E8}\u{1F1F1}',
  'Colombia': '\u{1F1E8}\u{1F1F4}', 'Costa Rica': '\u{1F1E8}\u{1F1F7}',
  'Croatia': '\u{1F1ED}\u{1F1F7}', 'DR Congo': '\u{1F1E8}\u{1F1E9}',
  'Ecuador': '\u{1F1EA}\u{1F1E8}', 'Egypt': '\u{1F1EA}\u{1F1EC}',
  'England': '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  'France': '\u{1F1EB}\u{1F1F7}', 'Germany': '\u{1F1E9}\u{1F1EA}',
  'Ghana': '\u{1F1EC}\u{1F1ED}', 'Honduras': '\u{1F1ED}\u{1F1F3}',
  'Indonesia': '\u{1F1EE}\u{1F1E9}', 'Iran': '\u{1F1EE}\u{1F1F7}',
  'Iraq': '\u{1F1EE}\u{1F1F6}', 'Italy': '\u{1F1EE}\u{1F1F9}',
  'Japan': '\u{1F1EF}\u{1F1F5}', 'Mexico': '\u{1F1F2}\u{1F1FD}',
  'Morocco': '\u{1F1F2}\u{1F1E6}', 'Netherlands': '\u{1F1F3}\u{1F1F1}',
  'New Zealand': '\u{1F1F3}\u{1F1FF}', 'Nigeria': '\u{1F1F3}\u{1F1EC}',
  'Panama': '\u{1F1F5}\u{1F1E6}', 'Paraguay': '\u{1F1F5}\u{1F1FE}',
  'Peru': '\u{1F1F5}\u{1F1EA}', 'Poland': '\u{1F1F5}\u{1F1F1}',
  'Portugal': '\u{1F1F5}\u{1F1F9}', 'Qatar': '\u{1F1F6}\u{1F1E6}',
  'Romania': '\u{1F1F7}\u{1F1F4}', 'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
  'Senegal': '\u{1F1F8}\u{1F1F3}', 'Serbia': '\u{1F1F7}\u{1F1F8}',
  'South Africa': '\u{1F1FF}\u{1F1E6}', 'South Korea': '\u{1F1F0}\u{1F1F7}',
  'Spain': '\u{1F1EA}\u{1F1F8}', 'Switzerland': '\u{1F1E8}\u{1F1ED}',
  'Tunisia': '\u{1F1F9}\u{1F1F3}', 'Turkey': '\u{1F1F9}\u{1F1F7}',
  'Ukraine': '\u{1F1FA}\u{1F1E6}', 'Uruguay': '\u{1F1FA}\u{1F1FE}',
  'USA': '\u{1F1FA}\u{1F1F8}', 'Venezuela': '\u{1F1FB}\u{1F1EA}',
};

// ── Types ───────────────────────────────────────────────────────────────────

interface Player {
  name: string;
  number: number;
  position: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface NationData {
  team: string;
  slug: string;
  seo: {
    seo_title: string;
    meta_description: string;
    hero_paragraph: string;
    history_paragraph: string;
    wc2026_outlook: string;
    faq: FAQ[];
    keywords: string[];
    generated_at: string | null;
    updated_at: string | null;
  } | null;
  squad: Player[];
  formation_profile: {
    primary_formation?: string;
    primary_probability?: number;
    tactical_style?: string;
    manager?: string;
    pressing_intensity?: string;
    key_tactical_trait?: string;
    fifa_ranking?: number;
    wc_titles?: number;
  } | null;
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ background: 'var(--border)' }} />;
}

function SkeletonPage() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-7 py-20 space-y-8">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-60 w-full" />
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-60 w-full" />
    </div>
  );
}

// ── FAQ Accordion ───────────────────────────────────────────────────────────

function FAQItem({ faq, index }: { faq: FAQ; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b transition-colors"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
      >
        <span className="font-sans font-semibold text-[15px]" style={{ color: 'var(--text)' }}>
          {faq.question}
        </span>
        <span
          className="text-lg transition-transform"
          style={{
            color: 'var(--muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: '0.3s ease',
          }}
        >
          {'\u25BE'}
        </span>
      </button>
      {open && (
        <div className="pb-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {faq.answer}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function NationPage() {
  const params = useParams();
  const teamSlug = params.team as string;

  const [data, setData] = useState<NationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/nations/${teamSlug}`);
      if (!res.ok) {
        setError('Nation not found');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError('Failed to load nation data');
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><NavBar /><SkeletonPage /></>;

  if (error || !data) {
    return (
      <>
        <NavBar />
        <div className="w-full max-w-[1200px] mx-auto px-7 py-28 text-center">
          <h1 className="font-display font-semibold text-4xl mb-4" style={{ color: 'var(--text)' }}>
            Nation not found
          </h1>
          <p className="text-base mb-8" style={{ color: 'var(--muted)' }}>
            The team you&apos;re looking for doesn&apos;t exist in our World Cup 2026 database.
          </p>
          <Link
            href="/nation"
            className="inline-block px-6 py-3 font-sans font-semibold text-sm rounded-lg transition-all"
            style={{
              background: 'var(--success)',
              color: 'var(--dark)',
            }}
          >
            Browse All Nations
          </Link>
        </div>
      </>
    );
  }

  const { team, seo, squad, formation_profile } = data;
  const flag = TEAM_FLAGS[team] || '';
  const manager = formation_profile?.manager || 'TBC';
  const tacticalStyle = formation_profile?.tactical_style || 'N/A';
  const primaryFormation = formation_profile?.primary_formation || '4-3-3';
  const formationProb = formation_profile?.primary_probability;
  const pressing = formation_profile?.pressing_intensity || 'Medium';
  const keyTrait = formation_profile?.key_tactical_trait || 'Balanced approach';
  const fifaRank = formation_profile?.fifa_ranking;
  const wcTitles = formation_profile?.wc_titles ?? 0;

  // Group squad by position
  const gk = squad.filter(p => p.position === 'GK');
  const def = squad.filter(p => ['RB', 'CB', 'LB'].includes(p.position));
  const mid = squad.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position));
  const fwd = squad.filter(p => ['RW', 'LW', 'ST'].includes(p.position));

  // Average "age" — placeholder since static squads don't have age
  const squadSize = squad.length;

  return (
    <>
      <NavBar />

      {/* FAQ JSON-LD */}
      {seo?.faq && seo.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: seo.faq.map(f => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: f.answer,
                },
              })),
            }),
          }}
        />
      )}

      {/* SportsTeam JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SportsTeam',
            name: team,
            sport: 'Football',
            url: `https://fanxi.vercel.app/nations/${teamSlug}`,
          }),
        }}
      />

      <main className="w-full max-w-[1200px] mx-auto px-7 pb-28 pt-8 space-y-10">

        {/* ── SECTION 1: HERO ──────────────────────────────────────────── */}
        <section className="text-center py-12">
          <div className="text-8xl mb-4">{flag}</div>
          <h1
            className="font-sans font-bold mb-3"
            style={{ fontSize: 'clamp(36px, 6vw, 56px)', color: 'var(--text)' }}
          >
            {team}
          </h1>
          <p className="font-display font-semibold text-lg tracking-wider uppercase" style={{ color: '#FF6B6B' }}>
            FIFA World Cup 2026
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <span
              className="px-3 py-1 rounded-full text-xs font-sans font-semibold"
              style={{ background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.2)', color: 'var(--success)' }}
            >
              {manager}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-sans font-semibold"
              style={{ background: 'rgba(0,209,255,0.1)', border: '1px solid rgba(0,209,255,0.2)', color: 'var(--blue)' }}
            >
              {tacticalStyle}
            </span>
          </div>
        </section>

        {/* ── SECTION 2: HERO PARAGRAPH ────────────────────────────────── */}
        {seo?.hero_paragraph && (
          <section
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(6,10,6,0.9)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="font-display text-lg leading-relaxed" style={{ color: 'var(--text)', opacity: 0.85 }}>
              {seo.hero_paragraph}
            </p>
          </section>
        )}

        {/* ── SECTION 3: QUICK STATS GRID ──────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'FIFA Rank', value: fifaRank ? `#${fifaRank}` : '—' },
            { label: 'WC Titles', value: wcTitles > 0 ? `${wcTitles}x` : '0' },
            { label: 'Squad Size', value: String(squadSize) },
            { label: 'Formation', value: primaryFormation },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-5 text-center"
              style={{
                background: 'rgba(6,10,6,0.9)',
                backdropFilter: 'blur(24px)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="font-display font-semibold text-2xl mb-1" style={{ color: 'var(--text)' }}>
                {stat.value}
              </div>
              <div className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* ── SECTION 4: FORMATION & TACTICS ───────────────────────────── */}
        <section
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(6,10,6,0.9)',
            backdropFilter: 'blur(24px)',
            border: '1px solid var(--border)',
          }}
        >
          <h2 className="font-display font-semibold text-2xl mb-6" style={{ color: 'var(--text)' }}>
            Formation &amp; Tactics
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Formation display */}
            <div
              className="rounded-xl p-6 flex items-center justify-center"
              style={{ background: 'rgba(0,255,133,0.03)', border: '1px solid rgba(0,255,133,0.1)' }}
            >
              <div className="text-center">
                <div className="font-display font-bold text-5xl mb-2" style={{ color: 'var(--success)' }}>
                  {primaryFormation}
                </div>
                {formationProb && (
                  <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {formationProb}% probability
                  </div>
                )}
              </div>
            </div>

            {/* Tactical breakdown */}
            <div className="space-y-4">
              {[
                { label: 'Primary Formation', value: primaryFormation },
                { label: 'Tactical Style', value: tacticalStyle },
                { label: 'Pressing Intensity', value: pressing },
                { label: 'Key Tactical Trait', value: keyTrait },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>{item.label}</span>
                  <span className="font-sans font-semibold text-sm" style={{ color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: SQUAD LIST ────────────────────────────────────── */}
        {squad.length > 0 && (
          <section
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(6,10,6,0.9)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
            }}
          >
            <h2 className="font-display font-semibold text-2xl mb-6" style={{ color: 'var(--text)' }}>
              Squad
            </h2>

            {[
              { label: 'Goalkeepers', players: gk },
              { label: 'Defenders', players: def },
              { label: 'Midfielders', players: mid },
              { label: 'Forwards', players: fwd },
            ].map((group) => group.players.length > 0 && (
              <div key={group.label} className="mb-6">
                <h3 className="font-sans font-semibold text-sm uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                  {group.label} ({group.players.length})
                </h3>
                <div className="space-y-1">
                  {group.players.map((p) => (
                    <div
                      key={`${p.number}-${p.name}`}
                      className="flex items-center gap-4 py-2 px-3 rounded-lg transition-colors"
                      style={{ background: 'rgba(30,45,30,0.3)' }}
                    >
                      <span className="font-mono text-xs w-8 text-center" style={{ color: 'var(--muted)' }}>
                        {p.number}
                      </span>
                      <span className="font-sans text-sm flex-1" style={{ color: 'var(--text)' }}>
                        {p.name}
                      </span>
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{
                          color: POS_COLORS[p.position] || 'var(--muted)',
                          background: `color-mix(in srgb, ${POS_COLORS[p.position] || 'var(--muted)'} 10%, transparent)`,
                        }}
                      >
                        {p.position}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── SECTION 6: WC HISTORY ────────────────────────────────────── */}
        {seo?.history_paragraph && (
          <section
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(6,10,6,0.9)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
            }}
          >
            <h2 className="font-display font-semibold text-2xl mb-4" style={{ color: '#FF6B6B' }}>
              World Cup History
            </h2>
            <p className="font-sans text-base leading-relaxed" style={{ color: 'var(--text)', opacity: 0.8 }}>
              {seo.history_paragraph}
            </p>
          </section>
        )}

        {/* ── SECTION 7: WC2026 OUTLOOK ────────────────────────────────── */}
        {seo?.wc2026_outlook && (
          <section
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(6,10,6,0.9)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
            }}
          >
            <h2 className="font-display font-semibold text-2xl mb-4" style={{ color: '#FF6B6B' }}>
              WC2026 Tactical Outlook
            </h2>
            <p className="font-sans text-base leading-relaxed" style={{ color: 'var(--text)', opacity: 0.8 }}>
              {seo.wc2026_outlook}
            </p>
            <div className="mt-4 font-mono text-xs" style={{ color: 'var(--muted)' }}>
              Powered by HERMES + VISION
            </div>
          </section>
        )}

        {/* ── SECTION 9: FAQ ───────────────────────────────────────────── */}
        {seo?.faq && seo.faq.length > 0 && (
          <section
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(6,10,6,0.9)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
            }}
          >
            <h2 className="font-display font-semibold text-2xl mb-6" style={{ color: 'var(--text)' }}>
              Frequently Asked Questions
            </h2>
            {seo.faq.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </section>
        )}

        {/* ── SECTION 10: CTA ──────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'rgba(6,10,6,0.9)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,107,107,0.3)',
          }}
        >
          <h2 className="font-display font-semibold text-3xl mb-3" style={{ color: 'var(--text)' }}>
            Predict {team}&apos;s Starting XI
          </h2>
          <p className="font-sans text-base mb-6" style={{ color: 'var(--muted)' }}>
            Lock in your formation, captain and tactics before kickoff
          </p>
          <Link
            href="/predict"
            className="inline-block px-8 py-3.5 font-sans font-semibold text-sm rounded-lg transition-all"
            style={{
              background: 'var(--success)',
              color: 'var(--dark)',
              boxShadow: '0 0 24px rgba(0,255,133,0.3)',
            }}
          >
            Make Your Prediction
          </Link>
        </section>

      </main>
    </>
  );
}
