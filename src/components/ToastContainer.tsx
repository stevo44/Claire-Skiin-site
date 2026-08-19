import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ToastMessage {
  id: number;
  message: string;
  icon?: string;
  type?: 'success' | 'error';
}

let toastListeners: ((t: ToastMessage) => void)[] = [];
let toastId = 0;

export function showToast(message: string, icon = 'check_circle', type: 'success' | 'error' = 'success') {
  const toast: ToastMessage = { id: ++toastId, message, icon, type };
  toastListeners.forEach(fn => fn(toast));
}

const AUTO_DISMISS_MS = 3200;

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  useEffect(() => {
    const fn = (t: ToastMessage) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => dismiss(t.id), AUTO_DISMISS_MS);
    };
    toastListeners.push(fn);
    return () => { toastListeners = toastListeners.filter(f => f !== fn); };
  }, [dismiss]);

  return createPortal(
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 items-center">
      {toasts.map(t => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className="flex items-center gap-2 bg-on-surface text-surface px-5 py-3 rounded-full text-sm font-semibold shadow-2xl whitespace-nowrap cursor-pointer hover:opacity-90 active:scale-95 transition-all group"
          style={{ animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          title="Click to dismiss"
        >
          <span
            className="material-symbols-outlined text-lg shrink-0"
            style={{ color: t.type === 'error' ? '#ef4444' : '#4ade80', fontVariationSettings: "'FILL' 1" }}
          >
            {t.icon}
          </span>
          <span>{t.message}</span>
          {/* X on hover */}
          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-60 transition-opacity ml-1 shrink-0">
            close
          </span>
        </button>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ToastContainer;
