import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import type {
  ConnectorsResponse,
  ConnectorPlugin,
  ConnectorEntry,
  TopicsResponse,
  ConfigDefinition,
  ValidationResult,
  TopicGroup,
  TopicSchemaResult,
} from '../types/connect';
import {
  fetchConnectors,
  fetchPlugins,
  fetchTopics,
  fetchConnector,
  deleteConnector,
  pauseConnector,
  resumeConnector,
  restartConnector,
  restartTask,
  fetchPluginConfig,
  validateConnectorConfig,
  createConnector,
  fetchTopicGroups,
  createTopicGroup,
  updateTopicGroup,
  deleteTopicGroup,
  fetchTopicSchema,
} from '../api/connectApi';
import { useToast } from './ToastContext';

interface ConnectContextValue {
  sinks: ConnectorEntry[];
  collectors: ConnectorEntry[];
  plugins: ConnectorPlugin[] | null;
  topics: TopicsResponse;
  loading: boolean;
  refresh: () => void;
  fetchConnector: (name: string) => Promise<ConnectorEntry>;
  deleteConnector: (name: string) => Promise<void>;
  pauseConnector: (name: string) => Promise<void>;
  resumeConnector: (name: string) => Promise<void>;
  restartConnector: (name: string) => Promise<void>;
  restartTask: (name: string, taskId: number) => Promise<void>;
  fetchPluginConfig: (pluginClass: string) => Promise<ConfigDefinition[]>;
  validateConnectorConfig: (pluginClass: string, config: Record<string, string>) => Promise<ValidationResult>;
  createConnector: (name: string, config: Record<string, string>) => Promise<unknown>;
  fetchTopicGroups: () => Promise<TopicGroup[]>;
  createTopicGroup: (name: string, topics: string[]) => Promise<TopicGroup>;
  updateTopicGroup: (oldName: string, name: string, topics: string[]) => Promise<TopicGroup>;
  deleteTopicGroup: (name: string) => Promise<void>;
  fetchTopicSchema: (topicName: string) => Promise<TopicSchemaResult>;
}

const ConnectContext = createContext<ConnectContextValue | null>(null);

export const ConnectProvider: FC<PropsWithChildren> = ({ children }) => {
  const [sinks, setSinks] = useState<ConnectorEntry[]>([]);
  const [collectors, setCollectors] = useState<ConnectorEntry[]>([]);
  const [plugins, setPlugins] = useState<ConnectorPlugin[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicsResponse>({})
  const toast = useToast();


  const getCollectors = (response: ConnectorsResponse): ConnectorEntry[] =>
    Object.entries(response).filter(([_, entry]) => entry.info.type === "source").map(([_, entry]) => entry)

  const getSinks = (response: ConnectorsResponse): ConnectorEntry[] =>
    Object.entries(response).filter(([_, entry]) => entry.info.type === "sink").map(([_, entry]) => entry)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connectorsData, pluginsData, topicsData] = await Promise.all([
        fetchConnectors(),
        fetchPlugins(),
        fetchTopics()
      ]);
      if (connectorsData) {
        setCollectors(getCollectors(connectorsData));
        setSinks(getSinks(connectorsData))
      } else {
        setCollectors([])
        setSinks([])
      }
      setPlugins(pluginsData);
      setTopics(topicsData)
    } catch (e) {
      toast.push(e instanceof Error ? e.message : 'Failed to load Kafka Connect data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const value = useMemo(
    () => ({
      sinks, collectors, plugins, topics, loading,
      refresh: () => { void load(); },
      fetchConnector,
      deleteConnector,
      pauseConnector,
      resumeConnector,
      restartConnector,
      restartTask,
      fetchPluginConfig,
      validateConnectorConfig,
      createConnector,
      fetchTopicGroups,
      createTopicGroup,
      updateTopicGroup,
      deleteTopicGroup,
      fetchTopicSchema,
    }),
    [sinks, collectors, plugins, topics, loading, load],
  );

  return <ConnectContext value={value}>{children}</ConnectContext>;
};

export function useConnect(): ConnectContextValue {
  const ctx = use(ConnectContext);
  if (!ctx) throw new Error('useConnect must be used within ConnectProvider');
  return ctx;
}