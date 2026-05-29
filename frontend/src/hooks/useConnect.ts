import type { ConnectContextValue } from '../types';
import { ConnectContext } from '../context/ConnectContext.tsx';
import { use } from 'react';

const useConnect = (): ConnectContextValue => {
  const ctx = use(ConnectContext);
  if (!ctx) throw new Error('useConnect must be used within ConnectProvider');
  return ctx;
};

export default useConnect;