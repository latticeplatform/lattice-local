import { createContext, use } from 'react';
import type { ConnectContextValue } from '../types';

export const ConnectContext = createContext<ConnectContextValue | null>(null);

export const useConnect = (): ConnectContextValue => {
  const ctx = use(ConnectContext);
  if (!ctx) throw new Error('useConnect must be used within ConnectProvider');
  return ctx;
};
