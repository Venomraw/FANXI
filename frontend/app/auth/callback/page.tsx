'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { router.replace('/login'); return; }

    loginWithToken(token).then(userData => {
      if (!userData) { router.replace('/login'); return; }
      router.replace(userData.onboarding_complete ? '/' : '/onboarding');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text)' }}>
      <p className="font-mono text-sm" style={{ color: 'var(--muted)', letterSpacing: '2px' }}>
        SIGNING IN...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
