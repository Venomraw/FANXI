'use client';
import React from 'react';
import { useBackendReady } from '@/src/hooks/useBackendReady';
import WakingScreen from '@/src/components/WakingScreen';

export default function BackendProvider({ children }: { children: React.ReactNode }) {
  const { status, elapsed, retry } = useBackendReady();

  return (
    <>
      {(status === 'waking' || status === 'timeout') && (
        <WakingScreen status={status} elapsed={elapsed} onRetry={retry} />
      )}
      {children}
    </>
  );
}
