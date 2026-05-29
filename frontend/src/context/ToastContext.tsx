import { createContext } from 'react';
import './ToastContext.css';
import type { ToastContextValue } from '../types';

export const ToastContext = createContext<ToastContextValue | null>(null);

