import React, { useEffect } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm, onCancel,
}) => {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Icon */}
        <div className={`flex items-center justify-center pt-8 pb-4`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${destructive ? 'bg-red-50' : 'bg-amber-50'}`}>
            <span className={`material-symbols-outlined text-[28px] ${destructive ? 'text-red-500' : 'text-amber-500'}`}
              style={{ fontVariationSettings: "'FILL' 1" }}>
              {destructive ? 'delete' : 'warning'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 text-center">
          <h3 className="font-headline text-lg text-stone-900 mb-2">{title}</h3>
          <p className="text-sm text-stone-500 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex border-t border-stone-100">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors border-r border-stone-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${
              destructive
                ? 'text-red-600 hover:bg-red-50'
                : 'text-primary hover:bg-primary/5'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
