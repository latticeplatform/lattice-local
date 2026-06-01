import type { ConnectState } from './types';

export const initialState: ConnectState = {
  collectors: [],
  sinks: [],
  plugins: null,
  topics: {},
  loading: true,
};

export const SENSITIVE_KEYS = /password|secret|credential|token|api[._-]?key/i;
