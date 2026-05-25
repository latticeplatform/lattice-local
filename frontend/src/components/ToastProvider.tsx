import { type FC, type PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { ToastContext } from '../context/ToastContext.tsx';
import type { Toast, ToastType } from '../types';
const DURATION_MS = 3000;

const ToastProvider: FC<PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType = 'error') => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        dismiss(id);
      }, DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            style={{ '--toast-duration': `${String(DURATION_MS)}ms` } as React.CSSProperties}
          >
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => {
                dismiss(toast.id);
              }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
};

export default ToastProvider;
