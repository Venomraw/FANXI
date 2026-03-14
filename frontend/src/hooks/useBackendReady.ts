'use client';
import { useCallback, useEffect, useState } from 'react';
import { fanxiLog } from '@/src/lib/logger';

export type BackendStatus = 'checking' | 'waking' | 'ready' | 'timeout';

interface UseBackendReadyReturn {
  status: BackendStatus;
  elapsed: number;
  retry: () => void;
}

export function useBackendReady(): UseBackendReadyReturn {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const [elapsed, setElapsed] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setStatus('checking');
    setElapsed(0);
    setRetryKey(k => k + 1);
  }, []);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    let cancelled = false;
    let pingId:    ReturnType<typeof setTimeout>   | undefined = undefined;
    let elapsedId: ReturnType<typeof setInterval>  | undefined = undefined;
    let wakingId:  ReturnType<typeof setTimeout>   | undefined = undefined;

    function cleanup() {
      if (pingId    !== undefined) clearTimeout(pingId);
      if (elapsedId !== undefined) clearInterval(elapsedId);
      if (wakingId  !== undefined) clearTimeout(wakingId);
    }

    function onReady() {
      if (cancelled) return;
      setStatus('ready');
      cleanup();
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, capped at 8s
    let delay = 1000;
    let attempt = 0;

    async function ping() {
      attempt++;
      try {
        const res = await fetch(`${API}/health`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          onReady();
          return;
        }
      } catch {
        fanxiLog.pollRetry(attempt, delay);
      }
      if (!cancelled) {
        delay = Math.min(delay * 2, 8000);
        pingId = setTimeout(ping, delay);
      }
    }

    // Immediate first ping
    ping();

    // Show waking overlay only if backend hasn't responded within 1 second
    wakingId = setTimeout(() => {
      if (!cancelled) setStatus(s => s === 'checking' ? 'waking' : s);
    }, 1000);

    // Tick elapsed; timeout after 60 seconds
    elapsedId = setInterval(() => {
      if (cancelled) return;
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= 60) {
          setStatus(s => s === 'waking' ? 'timeout' : s);
          cleanup();
        }
        return next;
      });
    }, 1000);

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [retryKey]);

  return { status, elapsed, retry };
}
