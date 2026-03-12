'use client';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/context/ToastContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useShareCard() {
  const { authFetch } = useAuth();
  const { toast } = useToast();

  // ── Card fetchers ────────────────────────────────────────────────────────────

  async function fetchPredictionCard(matchId: number, bust = false): Promise<Blob> {
    const url = `${API}/cards/prediction/${matchId}${bust ? '?bust=true' : ''}`;
    const res = await authFetch(url, { headers: { Accept: 'image/png' } });
    if (!res.ok) throw new Error('Card generation failed');
    return res.blob();
  }

  async function fetchProfileCard(username: string): Promise<Blob> {
    const res = await fetch(`${API}/cards/profile/${encodeURIComponent(username)}`, {
      headers: { Accept: 'image/png' },
    });
    if (!res.ok) throw new Error('Card generation failed');
    return res.blob();
  }

  // ── Download ────────────────────────────────────────────────────────────────

  function downloadCard(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Share targets ────────────────────────────────────────────────────────────

  function shareToX(text: string, url: string): void {
    const params = new URLSearchParams({ text: `${text}\n${url}` });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, '_blank', 'noopener');
  }

  function shareToWhatsApp(text: string, url: string): void {
    const params = new URLSearchParams({ text: `${text}\n${url}` });
    window.open(`https://wa.me/?${params.toString()}`, '_blank', 'noopener');
  }

  async function copyLink(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy — try manually');
    }
  }

  // ── Native share (mobile) ────────────────────────────────────────────────────

  async function nativeShare(title: string, text: string, url: string): Promise<boolean> {
    if (!navigator.share) return false;
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }

  return {
    fetchPredictionCard,
    fetchProfileCard,
    downloadCard,
    shareToX,
    shareToWhatsApp,
    copyLink,
    nativeShare,
  };
}
