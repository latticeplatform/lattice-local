import { createContext } from 'react';
import type { ConnectContextValue } from '../types';

export const ConnectContext = createContext<ConnectContextValue | null>(null);

