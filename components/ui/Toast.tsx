'use client';

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from './cn';

/**
 * Minimal toast system: one provider mounted in AppShell, push from anywhere
 * via useToast(). Stacks bottom-right, auto-dismisses, respects calm styling.
 */
type ToastVariant = 'success' | 'warning' | 'error';

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLE: Record<ToastVariant, { icon: ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />, ring: 'border-border' },
  warning: { icon: <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />, ring: 'border-border bg-warning-soft/40' },
  error: { icon: <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />, ring: 'border-border bg-danger-soft/40' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++idRef.current;
      setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => {
          const v = VARIANT_STYLE[t.variant ?? 'success'];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-card border bg-surface p-3 shadow-float',
                v.ring
              )}
            >
              <span className="mt-0.5 shrink-0">{v.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-ink-secondary">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-input p-1 text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
