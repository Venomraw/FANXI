'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import AppLoading from '../loading';

/**
 * Client-side auth guard for protected routes (/hub, /predict, /profile).
 *
 * Route protection lives here — NOT in middleware — because the httpOnly
 * refresh cookie is set by the API on a different origin (samesite=none) and
 * is therefore invisible to Next.js edge middleware. This guard instead waits
 * for AuthContext to attempt a silent /auth/refresh (which actually validates
 * the session server-side) and redirects to /login only once we know there is
 * no authenticated user.
 *
 * Scope: this layout wraps ONLY the (protected) route group. Public/SEO routes
 * under (app) — /matches, /nation, /ai, /leaderboard, /simulator, /guide,
 * /nations/[team] — are NOT guarded and stay reachable while logged out.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      const next = encodeURIComponent(pathname || '/hub');
      router.replace(`/login?next=${next}`);
    }
  }, [isLoading, user, pathname, router]);

  // While the session is being restored, show the shared loading skeleton.
  if (isLoading) return <AppLoading />;

  // Not authenticated — render the skeleton until the redirect above fires
  // (prevents a flash of protected content).
  if (!user) return <AppLoading />;

  return <>{children}</>;
}
