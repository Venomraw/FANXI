'use client';
import React, { createContext, useCallback, useContext, useState } from 'react';
import ToastContainer from '@/src/components/ToastContainer';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => {
      // Max 3 visible — drop oldest if over limit
      const next = [...prev, { id, type, message }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
    // Auto-dismiss after 4 seconds
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be called inside <ToastProvider>');
  const { addToast, dismiss, toasts } = ctx;
  return {
    toast: {
      success: (msg: string) => addToast('success', msg),
      error:   (msg: string) => addToast('error', msg),
      warning: (msg: string) => addToast('warning', msg),
      info:    (msg: string) => addToast('info', msg),
    },
    dismiss,
    toasts,
  };
}
