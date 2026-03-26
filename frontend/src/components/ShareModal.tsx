'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useShareCard } from '@/src/hooks/useShareCard';

interface ShareModalProps {
  type: 'prediction' | 'profile';
  matchId?: number;
  username?: string;
  /** Display hint shown in the tweet / WA message */
  matchLabel?: string;
  onClose: () => void;
}

export default function ShareModal({
  type,
  matchId,
  username,
  matchLabel,
  onClose,
}: ShareModalProps) {
  const { fetchPredictionCard, fetchProfileCard, downloadCard, shareToX, shareToWhatsApp, copyLink } =
    useShareCard();

  const [imgSrc, setImgSrc]       = useState<string | null>(null);
  const [blob, setBlob]           = useState<Blob | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [copied, setCopied]       = useState(false);
  const backdropRef               = useRef<HTMLDivElement>(null);

  // ── Derive share content ──────────────────────────────────────────────────────

  const shareUrl =
    type === 'prediction' && matchId
      ? `https://fanxi.vercel.app/matches/${matchId}/live`
      : `https://fanxi.vercel.app/profile/${username ?? ''}`;

  const shareText =
    type === 'prediction'
      ? `I just locked my tactical XI for ${matchLabel ?? 'a WC 2026 match'} on FanXI — can you beat my Football IQ? #FanXI #WorldCup2026 #WC2026`
      : `Check out my FanXI scout profile — ${username} competing for tactical supremacy at WC 2026. #FanXI #WorldCup2026`;

  const filename =
    type === 'prediction'
      ? `fanxi-prediction-${matchLabel?.replace(/\s+/g, '-').toLowerCase() ?? matchId}.png`
      : `fanxi-profile-${username}.png`;

  // ── Fetch card on mount ───────────────────────────────────────────────────────

  const fetchCard = useCallback(async () => {
    setLoading(true);
    setError(false);
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    setImgSrc(null);
    setBlob(null);
    try {
      const b =
        type === 'prediction' && matchId != null
          ? await fetchPredictionCard(matchId)
          : await fetchProfileCard(username ?? '');
      const url = URL.createObjectURL(b);
      setBlob(b);
      setImgSrc(url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, matchId, username]);

  useEffect(() => {
    fetchCard();
    return () => { if (imgSrc) URL.revokeObjectURL(imgSrc); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Close on backdrop click ───────────────────────────────────────────────────

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  // ── Close on Escape ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Share actions ─────────────────────────────────────────────────────────────

  async function handleCopy() {
    await copyLink(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    if (!blob) return;
    downloadCard(blob, filename);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full sm:w-auto sm:min-w-[480px] sm:max-w-[560px] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'rgba(8,16,8,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--red)' }}>
              {'// SHARE'}
            </p>
            <h3 className="font-display font-semibold" style={{ fontSize: '20px' }}>
              {type === 'prediction' ? 'Your Prediction Card' : 'Your Scout Profile'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full font-sans font-semibold text-[18px] transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', border: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            ✕
          </button>
        </div>

        {/* Card preview */}
        <div className="px-6 py-4">
          <div
            className="w-full rounded-lg overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: '1200 / 630',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {loading && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,45,85,0.4)', borderTopColor: 'var(--red)' }} />
                <p className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Generating card…
                </p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <span style={{ fontSize: '32px' }}>⚠️</span>
                <p className="font-sans text-[14px]" style={{ color: 'var(--muted)' }}>Card generation failed</p>
                <button
                  onClick={fetchCard}
                  className="font-sans font-semibold text-[13px] px-4 py-2 rounded-lg transition-all"
                  style={{ background: 'rgba(255,45,85,0.15)', color: 'var(--red)', border: '1px solid rgba(255,45,85,0.25)' }}
                >
                  Retry
                </button>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imgSrc && !loading && <img
                src={imgSrc}
                alt="Share card preview"
                className="w-full h-full object-contain"
                style={{ display: 'block' }}
              />
            }
          </div>
        </div>

        {/* Share buttons */}
        <div className="px-6 pb-2">
          <div className="grid grid-cols-3 gap-3">
            {/* X / Twitter */}
            <button
              onClick={() => shareToX(shareText, shareUrl)}
              className="flex flex-col items-center gap-2 py-4 rounded-xl font-sans font-semibold text-[13px] transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <span style={{ fontSize: '22px' }}>𝕏</span>
              Post on X
            </button>

            {/* WhatsApp */}
            <button
              onClick={() => shareToWhatsApp(shareText, shareUrl)}
              className="flex flex-col items-center gap-2 py-4 rounded-xl font-sans font-semibold text-[13px] transition-all duration-200"
              style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', color: 'var(--text)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.06)'; }}
            >
              <span style={{ fontSize: '22px' }}>💬</span>
              WhatsApp
            </button>

            {/* Copy link */}
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-2 py-4 rounded-xl font-sans font-semibold text-[13px] transition-all duration-200"
              style={{
                background: copied ? 'rgba(0,255,133,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${copied ? 'rgba(0,255,133,0.25)' : 'rgba(255,255,255,0.08)'}`,
                color: copied ? 'var(--success)' : 'var(--text)',
              }}
            >
              <span style={{ fontSize: '22px' }}>{copied ? '✓' : '🔗'}</span>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Download */}
        <div className="px-6 pt-2 pb-6">
          <button
            onClick={handleDownload}
            disabled={!blob || loading}
            className="w-full py-3.5 rounded-xl font-sans font-bold text-[14px] transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: blob && !loading ? 'rgba(255,45,85,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${blob && !loading ? 'rgba(255,45,85,0.25)' : 'rgba(255,255,255,0.06)'}`,
              color: blob && !loading ? 'var(--red)' : 'var(--muted)',
            }}
            onMouseEnter={e => { if (blob && !loading) e.currentTarget.style.background = 'rgba(255,45,85,0.2)'; }}
            onMouseLeave={e => { if (blob && !loading) e.currentTarget.style.background = 'rgba(255,45,85,0.12)'; }}
          >
            ↓ Download Card
          </button>
        </div>
      </div>
    </div>
  );
}
