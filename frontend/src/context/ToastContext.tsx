import { createContext, useContext } from 'react';
import './ToastContext.css';
import type { ToastContextValue } from '../types';

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
