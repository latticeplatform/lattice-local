import type { ConnectState } from './types';

export const initialState: ConnectState = {
  collectors: [],
  sinks: [],
  plugins: null,
  topics: {},
  loading: true,
};
