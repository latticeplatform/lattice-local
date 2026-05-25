import {
  type FC,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import connectionReducer from '../reducers/connectionReducer.ts';
import { initialState } from '../constants.ts';
import { useToast } from '../context/ToastContext.tsx';
import type { ActionResultMap, ConnectDispatchAction } from '../types';
import apiActionReducer from '../reducers/apiActionReducer.ts';
import createConnectorApi from '../api/connectorApi.ts';
import createPluginApi from '../api/pluginApi.ts';
import createTopicApi from '../api/topicApi.ts';
import { ConnectContext } from '../context/ConnectContext.tsx';

const connectorApi = createConnectorApi();
const pluginApi = createPluginApi();
const topicApi = createTopicApi();

const ConnectProvider: FC<PropsWithChildren> = ({ children }) => {
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
  );

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

export default ConnectProvider;
