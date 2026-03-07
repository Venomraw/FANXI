'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Refresh lock — prevents parallel /auth/refresh calls ──────────────────
// If multiple requests 401 at the same time, only the first triggers a
// refresh. The rest are queued and resolved with the new token once it arrives.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function flushQueue(newToken: string) {
  refreshQueue.forEach(resolve => resolve(newToken));
  refreshQueue = [];
}

function clearQueue() {
  refreshQueue = [];
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
  onboarding_complete: boolean;
  display_name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<string | null>;
  loginWithToken: (accessToken: string) => Promise<AuthUser | null>;
  updateUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  isLoading: boolean;
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: async () => null,
  loginWithToken: async () => null,
  updateUser: () => {},
  logout: async () => {},
  authFetch: (input, init) => fetch(input, init),
  isLoading: true,
});

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Access token lives in memory only — never written to localStorage.
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: attempt a silent session restore via the httpOnly refresh cookie.
  // If the cookie is present and valid, we get a new access token back and
  // the user is logged in without seeing a login screen.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // sends the httpOnly cookie
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.access_token);
          // Restore user from localStorage cache (non-sensitive, no token)
          const cachedUser = localStorage.getItem('fanxi_user');
          if (cachedUser) setUser(JSON.parse(cachedUser));
        }
      } catch {
        // No cookie or network error — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── authFetch ────────────────────────────────────────────────────────────
  // Drop-in replacement for fetch() that:
  //   1. Attaches Authorization: Bearer <token>
  //   2. On 401: calls /auth/refresh once (with queue lock)
  //   3. Retries the original request with the new token
  //   4. On refresh failure: redirects to /login
  async function authFetch(
    input: RequestInfo,
    init: RequestInit = {},
    _accessToken: string | null = token,
  ): Promise<Response> {
    const makeRequest = (t: string | null) =>
      fetch(input, {
        ...init,
        credentials: 'include',
        headers: {
          ...init.headers,
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
      });

    const res = await makeRequest(_accessToken);

    // ── 429 received — rate limited ──────────────────────────────────────
    // Do not retry. Throw a structured error so callers can show the user
    // exactly how long to wait instead of a generic failure message.
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const retryAfter = Number(body.retry_after ?? res.headers.get('Retry-After') ?? 60);
      throw { code: 'RATE_LIMITED', retryAfter };
    }

    if (res.status !== 401) return res;

    // ── 401 received — attempt refresh ──────────────────────────────────
    if (isRefreshing) {
      // Another refresh is in flight — queue this retry
      return new Promise<Response>(resolve => {
        refreshQueue.push(newToken => resolve(makeRequest(newToken)));
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!refreshRes.ok) throw new Error('Refresh failed');

      const { access_token: newToken } = await refreshRes.json();
      setToken(newToken);
      flushQueue(newToken);
      return makeRequest(newToken);
    } catch {
      clearQueue();
      setToken(null);
      setUser(null);
      localStorage.removeItem('fanxi_user');
      window.location.href = '/login';
      return new Response(null, { status: 401 });
    } finally {
      isRefreshing = false;
    }
  }

  // ── Login ────────────────────────────────────────────────────────────────

  async function login(username: string, password: string): Promise<string | null> {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      credentials: 'include', // allows the refresh cookie to be set
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }).toString(),
    });

    if (!res.ok) {
      // 429 — rate limited: tell the user exactly how long to wait
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        const seconds = Number(body.retry_after ?? res.headers.get('Retry-After') ?? 60);
        return `Too many login attempts. Please wait ${seconds} second${seconds !== 1 ? 's' : ''}.`;
      }
      const err = await res.json();
      const detail = err.detail;
      if (Array.isArray(detail)) return detail.map((e: { msg: string }) => e.msg).join(', ');
      return typeof detail === 'string' ? detail : 'Login failed';
    }

    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    // Cache non-sensitive user info for instant UI restore on next visit
    localStorage.setItem('fanxi_user', JSON.stringify(data.user));
    return null;
  }

  // ── Login with token (Google OAuth callback) ─────────────────────────────

  async function loginWithToken(accessToken: string): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const userData: AuthUser = await res.json();
      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('fanxi_user', JSON.stringify(userData));
      return userData;
    } catch {
      return null;
    }
  }

  // ── Update user in context (e.g. after onboarding PATCH) ─────────────────

  function updateUser(userData: AuthUser) {
    setUser(userData);
    localStorage.setItem('fanxi_user', JSON.stringify(userData));
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  async function logout() {
    try {
      // Clears the httpOnly refresh cookie server-side
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue logout even if request fails
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('fanxi_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, updateUser, logout, authFetch, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
