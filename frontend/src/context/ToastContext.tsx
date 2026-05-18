import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type FC,
  type PropsWithChildren,
} from 'react';
import './ToastContext.css';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  push: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 3000;

export const ToastProvider: FC<PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message: string, type: ToastType = 'error') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), DURATION_MS);
  }, [dismiss]);

  return (
    <ToastContext value={{ push }}>
      {children}
      <div className="toast-stack">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            style={{ '--toast-duration': `${DURATION_MS}ms` } as React.CSSProperties}
          >
            <span className="toast-message">{toast.message}</span>
            <button className="toast-dismiss" onClick={() => dismiss(toast.id)} aria-label="Dismiss">✕</button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}