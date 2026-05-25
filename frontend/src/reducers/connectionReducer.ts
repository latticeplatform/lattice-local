import type { ConnectAction, ConnectorEntry, ConnectorState, ConnectState } from '../types';

const setConnectorStatus = (
  entries: ConnectorEntry[],
  name: string,
  state: ConnectorState
): ConnectorEntry[] =>
  entries.map((e) =>
    e.info.name === name
      ? { ...e, status: { ...e.status, connector: { ...e.status.connector, state } } }
      : e
  );

const setTaskStatus = (
  entries: ConnectorEntry[],
  connectorName: string,
  taskId: number,
  state: ConnectorState
): ConnectorEntry[] =>
  entries.map((e) =>
    e.info.name === connectorName
      ? {
          ...e,
          status: {
            ...e.status,
            tasks: e.status.tasks.map((t) => (t.id === taskId ? { ...t, state } : t)),
          },
        }
      : e
  );

const updateBoth = (
  s: ConnectState,
  fn: (entries: ConnectorEntry[]) => ConnectorEntry[]
): ConnectState => ({ ...s, collectors: fn(s.collectors), sinks: fn(s.sinks) });

const connectionReducer = (state: ConnectState, action: ConnectAction): ConnectState => {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true };

    case 'LOAD_SUCCESS': {
      const entries = Object.values(action.connectors);
      return {
        loading: false,
        collectors: entries.filter((e) => e.info.type === 'source'),
        sinks: entries.filter((e) => e.info.type === 'sink'),
        plugins: action.plugins,
        topics: action.topics,
      };
    }

    case 'LOAD_ERROR':
      return { ...state, loading: false };

    case 'CONNECTOR_CREATED': {
      const { entry } = action;
      return entry.info.type === 'source'
        ? { ...state, collectors: [...state.collectors, entry] }
        : { ...state, sinks: [...state.sinks, entry] };
    }

    case 'CONNECTOR_DELETED':
      return updateBoth(state, (entries) => entries.filter((e) => e.info.name !== action.name));

    case 'CONNECTOR_PAUSED':
      return updateBoth(state, (entries) => setConnectorStatus(entries, action.name, 'PAUSED'));

    case 'CONNECTOR_RESUMED':
      return updateBoth(state, (entries) => setConnectorStatus(entries, action.name, 'RUNNING'));

    case 'CONNECTOR_RESTARTED':
      return updateBoth(state, (entries) => setConnectorStatus(entries, action.name, 'RUNNING'));

    case 'TASK_RESTARTED':
      return updateBoth(state, (entries) =>
        setTaskStatus(entries, action.connectorName, action.taskId, 'RUNNING')
      );
  }
};

export default connectionReducer;
