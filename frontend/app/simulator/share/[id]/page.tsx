'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BracketShareCard, { type BracketShareCardProps } from '@/src/components/simulator/BracketShareCard';
import { getTeamInfo } from '@/src/data/wc2026Groups';
import NavBar from '@/src/components/NavBar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface SharedBracketData {
  share_id: string;
  display_name: string;
  champion: string;
  finalist: string;
  bracket_data: BracketShareCardProps;
  created_at: string;
}

export default function SharedBracketPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SharedBracketData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const bracketCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/simulator/share/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d: SharedBracketData) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  const downloadImage = useCallback(async () => {
    if (!bracketCardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(bracketCardRef.current, {
        scale: 1.5,
        backgroundColor: '#050810',
        useCORS: true,
        allowTaint: true,
        width: 1600,
        height: 960,
      });
      const link = document.createElement('a');
      link.download = 'wc2026-bracket.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen text-white" style={{ background: 'var(--dark)' }}>
        <NavBar subtitle="BRACKET" />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl" style={{ animation: 'wakeFloat 1.8s ease-in-out infinite' }}>⚽</div>
            <p className="font-mono text-xs uppercase tracking-[3px]" style={{ color: 'var(--muted)' }}>
              Loading bracket...
            </p>
          </div>
        </div>
        <style>{`@keyframes wakeFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }`}</style>
      </div>
    );
  }

  // Not found
  if (error || !data) {
    return (
      <div className="min-h-screen text-white" style={{ background: 'var(--dark)' }}>
        <NavBar subtitle="BRACKET" />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-6 text-center px-6">
            <div className="text-6xl">🏟️</div>
            <h1 className="font-display font-semibold text-3xl">Bracket Not Found</h1>
            <p className="font-sans text-[15px]" style={{ color: 'var(--muted)' }}>
              This bracket may have been removed or the link is invalid.
            </p>
            <Link
              href="/simulator"
              className="font-sans font-semibold text-[14px] px-8 py-3.5 transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--red, #dc2626)',
                color: 'white',
                boxShadow: '0 0 20px rgba(220,38,38,0.35)',
              }}
            >
              Build Your Own Bracket
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const champInfo = getTeamInfo(data.champion);
  const finalistInfo = getTeamInfo(data.finalist);
  const title = data.display_name
    ? `${data.display_name}'s WC2026 Bracket`
    : 'WC2026 Bracket';

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--dark)' }}>
      <NavBar subtitle="SHARED BRACKET" />
      <div className="grid-bg opacity-20" />

      <div className="max-w-[1200px] mx-auto px-7 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="font-mono text-xs uppercase tracking-[2px] mb-3" style={{ color: 'var(--muted)' }}>
            {title}
          </p>
          <h1 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', color: 'var(--text)' }}>
            {champInfo.flag} <span style={{ color: champInfo.primary }}>{data.champion}</span>
          </h1>
          <p className="font-sans text-[16px]" style={{ color: 'var(--muted)' }}>
            Champion prediction &middot; {data.champion} vs {data.finalist} in the final
          </p>
        </div>

        {/* Bracket visualization */}
        <div
          className="mb-8 overflow-hidden mx-auto"
          style={{
            width: '100%',
            maxWidth: 1000,
            aspectRatio: '1600 / 960',
            position: 'relative',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              transform: 'scale(var(--bracket-scale))',
              transformOrigin: 'top left',
              width: 1600,
              height: 960,
              position: 'absolute',
              left: 0,
              top: 0,
              // @ts-expect-error CSS custom property
              '--bracket-scale': 'calc(min(1000px, 100vw - 56px) / 1600)',
            }}
          >
            <BracketShareCard {...data.bracket_data} ref={null} inline />
          </div>
        </div>

        {/* Final matchup card */}
        <div
          className="mx-auto mb-10 p-6 text-center"
          style={{
            maxWidth: 500,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[2px] mb-4" style={{ color: 'var(--muted)' }}>
            The Final
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">{champInfo.flag}</span>
              <span className="font-display font-semibold text-[16px]" style={{ color: champInfo.primary }}>
                {data.champion}
              </span>
            </div>
            <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>vs</span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">{finalistInfo.flag}</span>
              <span className="font-display font-semibold text-[16px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {data.finalist}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/simulator"
            className="font-sans font-semibold text-[15px] px-10 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: 'var(--red, #dc2626)',
              color: 'white',
              boxShadow: '0 0 24px rgba(220,38,38,0.4)',
              borderRadius: 2,
            }}
          >
            Build Your Own Bracket →
          </Link>
          <button
            type="button"
            onClick={downloadImage}
            disabled={downloading}
            className="font-sans text-[13px] px-6 py-2.5 transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              color: downloading ? 'var(--muted)' : 'var(--text)',
              cursor: downloading ? 'wait' : 'pointer',
            }}
          >
            {downloading ? 'Generating...' : 'Download Bracket Image'}
          </button>
        </div>

        {/* Off-screen bracket card for html2canvas */}
        <BracketShareCard ref={bracketCardRef} {...data.bracket_data} />
      </div>
    </div>
  );
}
