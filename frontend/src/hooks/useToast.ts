import type { ToastContextValue } from '../types';
import { ToastContext } from '../context/ToastContext.tsx';
import { useContext } from 'react';

const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
export default useToast;
