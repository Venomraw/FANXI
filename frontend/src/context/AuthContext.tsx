'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  country_allegiance: string;
  football_iq_points: number;
  rank_title: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  login: async () => null,
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('fanxi_token');
    const savedUser = localStorage.getItem('fanxi_user');
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  async function login(username: string, password: string): Promise<string | null> {
    const body = new URLSearchParams({ username, password });
    const res = await fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      return err.detail ?? 'Login failed';
    }

    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('fanxi_token', data.access_token);
    localStorage.setItem('fanxi_user', JSON.stringify(data.user));
    return null; // null = no error
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fanxi_token');
    localStorage.removeItem('fanxi_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
