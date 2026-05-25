import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type FC,
  type PropsWithChildren,
} from 'react';
import type { ConnectorPlugin, ConnectorEntry, TopicsResponse, ConnectState } from '../types';
import { useToast } from './ToastContext';
import createConnectorApi from '../api/connectorApi';
import createPluginApi from '../api/pluginApi';
import createTopicApi from '../api/topicApi';
import connectionReducer from '../reducers/connectionReducer.ts';
import apiActionReducer from '../reducers/apiActionReducer.ts';
import type { ActionResultMap, ConnectDispatch, ConnectDispatchAction } from '../types';

const connectorApi = createConnectorApi();
const pluginApi = createPluginApi();
const topicApi = createTopicApi();

interface ConnectContextValue {
  sinks: ConnectorEntry[];
  collectors: ConnectorEntry[];
  plugins: ConnectorPlugin[] | null;
  topics: TopicsResponse;
  loading: boolean;
  refresh: () => void;
  dispatch: ConnectDispatch;
}

export const initialState: ConnectState = {
  collectors: [],
  sinks: [],
  plugins: null,
  topics: {},
  loading: true,
};

const ConnectContext = createContext<ConnectContextValue | null>(null);

export const ConnectProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, stateDispatch] = useReducer(connectionReducer, initialState);
  const toast = useToast();

  const load = useCallback(async () => {
    stateDispatch({ type: 'LOAD_START' });
    try {
      const [connectors, plugins, topics] = await Promise.all([
        connectorApi.fetchAll(),
        pluginApi.fetchAll(),
        topicApi.fetchAll(),
      ]);
      stateDispatch({ type: 'LOAD_SUCCESS', connectors, plugins, topics });
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to load Kafka Connect data');
      stateDispatch({ type: 'LOAD_ERROR' });
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const dispatch = useCallback(
    <A extends ConnectDispatchAction>(action: A) =>
      apiActionReducer(action, stateDispatch) as Promise<ActionResultMap[A['type']]>,
    []
  ) as ConnectDispatch;

  const value = useMemo(
    () => ({
      ...state,
      refresh: () => {
        void load();
      },
      dispatch,
    }),
    [state, load, dispatch]
  );

  return <ConnectContext value={value}>{children}</ConnectContext>;
};

export function useConnect(): ConnectContextValue {
  const ctx = use(ConnectContext);
  if (!ctx) throw new Error('useConnect must be used within ConnectProvider');
  return ctx;
}
