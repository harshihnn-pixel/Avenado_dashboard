// A real, wired-up toast system — the .toast / .toast-wrap CSS already
// existed in app.css but nothing ever rendered through it. This provider
// backs every create/update/delete/verify/approve action across the app
// with a genuine, dismissable confirmation, per the "every visible action
// must have a meaningful frontend response" requirement.
//
// Frontend-only: these are in-memory UI acknowledgements of a local-state
// change that already happened (the localStorage write is synchronous and
// already done by the time the toast fires) — never a claim that a server
// accepted anything.
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { IconBadge, IconAlert, IconClipboard } from './icons';

export type ToastTone = 'success' | 'error' | 'info';
interface ToastItem { id: string; tone: ToastTone; message: string; }

interface ToastCtx { show: (message: string, tone?: ToastTone) => void; }
const Ctx = createContext<ToastCtx | null>(null);

const ICONS: Record<ToastTone, React.ComponentType<{ size?: number }>> = {
  success: IconBadge, error: IconAlert, info: IconClipboard,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = `t${++counter.current}`;
    setItems((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => dismiss(t.id)}>
              <Icon size={15} />
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
